'use strict';

var assert = require('assert');
var merge = require('merge');
var kad = require('kad');
var async = require('async');
var uuid = require('node-uuid');
var BloomFilter = require('./bloomfilter');

/**
 * Implements the Quasar routing protocol given a `kad.Router`
 * @constructor
 * @param {kad.Router} router - The router instance to use
 * @param {Object} options
 * @param {Number} options.ttl - The amount of milliseconds a publication lives
 * @see research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf
 */
function Quasar(router, options) {
  if (!(this instanceof Quasar)) {
    return new Quasar(router, options);
  }

  assert(router instanceof kad.Router, 'Invalid router supplied');

  this._router = router;
  this._options = merge(Object.create(Quasar.DEFAULTS), options);
  this._groups = {};
  this._bf = new BloomFilter();
  this._protocol = {};
  this._seen = [];
  this._log = this._options.logger || this._router._log;

  this._protocol[Quasar.PUBLISH_METHOD] = this._handlePublish.bind(this);
  this._protocol[Quasar.SUBSCRIBE_METHOD] = this._handleSubscribe.bind(this);
  this._protocol[Quasar.UPDATE_METHOD] = this._handleUpdate.bind(this);

  this._router._rpc.before('receive', kad.hooks.protocol(this._protocol));
}

Quasar.DEFAULTS = {
  ttl: kad.constants.T_RESPONSETIMEOUT
};

Quasar.PUBLISH_METHOD = 'PUBLISH';
Quasar.SUBSCRIBE_METHOD = 'SUBSCRIBE';
Quasar.UPDATE_METHOD = 'UPDATE';

/**
 * Publish some data for the given topic
 * @param {String} topic - The publication identifier
 * @param {Object} data - Arbitrary publication contents
 */
Quasar.prototype.publish = function(topic, data) {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;
  var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

  this._log.info('publishing message on topic "%s"', topic);

  // Dispatch message to our closest neighbors
  async.each(neighbors, function(contact, done) {
    // Construct our PUBLISH message
    var message = kad.Message({
      method: Quasar.PUBLISH_METHOD,
      params: {
        uuid: uuid.v4(),
        topic: topic,
        contents: data,
        publishers: [nodeID],
        ttl: Date.now() + self._options.ttl,
        contact: self._router._self
      }
    });

    self._router._rpc.send(contact, message, done);
  });
};

/**
 * Subscribe to the given topic and handle events
 * @param {String} topic - The publication identifier
 * @param {Function} callback - Function to call when publication is received
 */
Quasar.prototype.subscribe = function(topic, callback) {
  // Set a handler for when we receive a publication we are interested in
  this._groups[topic] = callback;

  this._log.info('subscribing to topic "%s"', topic);

  // Update our ABF with our subscription information, add our negative
  // information, then update our neighbors with our bloom filters
  this._bf.filters[0].add(topic);
  this._bf.filters[0].add(this._router._self.nodeID);
  this._sendUpdatesToNeighbors();
};

/**
 * Implements the Quasar join protocol
 * @private
 */
Quasar.prototype._sendUpdatesToNeighbors = function() {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;

  // Get our nearest overlay neighbors
  var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

  this._log.debug('requesting neighbors\' bloom filters');

  // Get neighbors bloom filters and merge them with our own
  this._updateAttenuatedBloomFilter(neighbors, function() {
    // Send our neighbors our merged bloom filters
    for (var n = 0; n < neighbors.length; n++) {
      self._updateNeighbor(neighbors[n]);
    }
  });
};

/**
 * Iteratitvely update our local bloom filters with our neighbors'
 * @private
 * @param {Array} neighbors
 * @param {Function} callback
 */
Quasar.prototype._updateAttenuatedBloomFilter = function(neighbors, callback) {
  var self = this;

  // Iterate over all the given neighbors
  async.each(neighbors, function(contact, done) {
    // If we haven't seen this contact since the TTL, then ignore
    // if (contact.lastSeen > (Date.now() - self._options.ttl)) {
    //   self._log.debug('ignoring contact not seen since ttl');
    //   return done();
    // }
    // Ask the contact for their attenuated bloom filter
    self._getBloomFilterFromNeighbor(contact, function(err, atbf) {
      if (err) {
        self._log.warn(
          'failed to get neighbor\'s bloom filter, reason: %s',
          err.message
        );
        return done();
      }

      self._log.info('merging neighbor\'s bloom filter with our own');
      // Merge the remote copy of the bloom filter with our own
      self._applyAttenuatedBloomFilterUpdate(atbf);
      done();
    });
  }, callback);
};

/**
 * Merges the attenuated bloom filter with our own
 * @private
 * @param {BloomFilter} atbf
 */
Quasar.prototype._applyAttenuatedBloomFilterUpdate = function(atbf) {
  // Iterate for the depth of our bitfield minus our view of neighbors
  for (var f = 1; f < this._bf.depth; f++) {
    // Then for each bloom filter in our neighbor's response, merge their
    // bloom filter with ours for the given "hop" in our attenuated filter
    for (var b = 0; b < atbf.filters[f].bitfield.buffer.length; b++) {
      var local = this._bf.filters[f].bitfield.buffer;
      var remote = atbf.filters[f].bitfield.buffer;

      local[b] += remote[b];
    }
  }

  return this._bf;
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handlePublish = function(params, callback) {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;
  var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

  // Check to make sure that we have not already seen this message
  if (this._seen.indexOf(params.uuid) !== -1) {
    return callback(new Error('Message previously routed'));
  }

  this._seen.push(params.uuid);

  // If the message has expired, just drop it
  if (Date.now() > params.ttl) {
    return callback(new Error('Message has expired'));
  }

  // Check if we are subscribed to this topic
  if (this._bf.filters[0].has(params.topic) && this._groups[params.topic]) {
    // If we are, then execute our subscription handler
    this._groups[params.topic](params.contents);
    // Add ourselves to the publishers (negative information)
    params.publishers.push(nodeID);
    // Pass the publication along to our neighbors
    return async.each(neighbors.filter(function(contact) {
      return params.publishers.indexOf(contact.nodeID) === -1;
    }), function(contact, done) {
      self._router._rpc.send(contact, kad.Message({
        params: merge(params, { contact: self._router._self }),
        method: Quasar.PUBLISH_METHOD
      }), done);
    }, callback);
  }

  // We are not interested in this message, so let's forward it on to our
  // neighbors to see if any of them are interested
  this._relayPublication(neighbors, params, callback);
};

/**
 * Relays the message to the given neighbors
 * @private
 * @param {Array} neighbors
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._relayPublication = function(neighbors, params, callback) {
  var self = this;
  var nodeID = this._router._self.nodeID;

  // Ack the original sender, so they do not drop us from routing table
  callback(null, {});

  // Get the bloom filters for all of our closest neighbors
  async.filter(neighbors, function(contact, done) {

    function onResponse() {
      done(true);
    }

    self._getBloomFilterFromNeighbor(contact, function(err, atbf) {
      if (err) {
        return done(false);
      }

      // We iterate over the total number of hops in our bloom filter
      for (var i = 0; i < self._bf.depth; i++) {

        // Check if their bloom filter for the given hop contains the topic
        if (atbf.filters[i].has(params.topic)) {
          var negativeRT = false;

          // Check if their bloom filter contains any of the negative
          // information for the previous message publishers
          for (var p = 0; p < params.publishers.length; p++) {
            if (atbf.filters[i].has(params.publishers[p])) {
              negativeRT = true;
            }
          }

          // If there is isn't any negative information, then let's relay the
          // message to the contact
          if (!negativeRT) {
            var msg = kad.Message({
              params: merge(params, { contact: self._router._self }),
              method: Quasar.PUBLISH_METHOD
            });
            return self._router._rpc.send(contact, msg, onResponse);
          }
        }
      }

      // Nothing to do, all done
      done(false);
    });
  }, function(results) {
    // If none of the neighbors in the above loop should get the message
    // then we must pick a random overlay neighbor and send it to them
    if (!results.length) {
      var randNeighbor = self._getRandomOverlayNeighbor(nodeID, params.topic);

      self._router._rpc.send(randNeighbor, kad.Message({
        params: merge(params, { contact: self._router._self }),
        method: Quasar.PUBLISH_METHOD
      }), function() {});
    }
  });
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handleSubscribe = function(params, callback) {
  callback(null, { filters: this._bf.serialize() });
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handleUpdate = function(params, callback) {
  this._applyAttenuatedBloomFilterUpdate(
    BloomFilter.deserialize(params.filters)
  );

  callback(null, {});
};

/**
 * Request a copy of the contact's attenuated bloom filter (SUBSCRIBE)
 * @private
 * @param {kad.Contact} contact
 * @param {Function} callback
 */
Quasar.prototype._getBloomFilterFromNeighbor = function(contact, callback) {
  // Construct our SUBSCRIBE message
  var message = kad.Message({
    method: Quasar.SUBSCRIBE_METHOD,
    params: { contact: this._router._self }
  });

  this._router._rpc.send(contact, message, function(err, message) {
    if (err) {
      return callback(err);
    }

    if (!message.result.filters) {
      return callback(new Error('Invalid response received'));
    }

    callback(null, BloomFilter.deserialize(message.result.filters));
  });
};

/**
 * Send the contact our updated attenuated bloom filter
 * @private
 */
Quasar.prototype._updateNeighbor = function(contact) {
  var self = this;

  // Construct our UPDATE message
  var message = kad.Message({
    method: Quasar.UPDATE_METHOD,
    params: {
      filters: this._bf.serialize(),
      contact: this._router._self
    }
  });

  this._router._rpc.send(contact, message, function(err) {
    if (err) {
      self._log.warn('failed to update neighbor with bloom filter');
    }
  });
};

/**
 * Returns a random contact for the given topic
 * @private
 * @param {String} nodeID
 * @param {String} topic
 * @returns {kad.Contact}
 */
Quasar.prototype._getRandomOverlayNeighbor = function(nodeID, topic) {
  var randIndex = kad.utils.getBucketIndex(nodeID, kad.utils.createID(topic));
  var randBucket = kad.utils.getRandomInBucketRangeBuffer(randIndex);
  var randKey = kad.utils.createID(randBucket);

  return this._router.getNearestContacts(randKey, 1, nodeID)[0];
};

module.exports = Quasar;
