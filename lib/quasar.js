/**
 * @class quasar
 */

'use strict';

var assert = require('assert');
var merge = require('merge');
var kad = require('kad');
var async = require('async');
var AttenuatedBloomFilter = require('./attenuated-bloom-filter');

/**
 * Implements the Quasar routing protocol given a `kad.Router`
 * @constructor
 * @param {kad.Router}
 * @param {Object} options
 * @see research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf
 */
function Quasar(router, options) {
  if (!(this instanceof Quasar)) {
    return new Quasar(router, options);
  }

  assert(router instanceof kad.Router, 'Invalid router supplied');

  this._router = router;
  this._options = merge(Object.create(Quasar.DEFAULTS), options);

  this._bf = new AttenuatedBloomFilter(
    this._options.bf.size,
    this._options.bf.depth
  );

  this._groups = [];

  this._router._rpc.before('receive', this._routeMessage.bind(this));
}

Quasar.DEFAULTS = {
  bf: {
    size: kad.constants.B,
    depth: kad.constants.K
  },
  ttl: kad.constants.T_RESPONSETIMEOUT
};

Quasar.PUBLISH_METHOD = 'PUBLISH';
Quasar.SUBSCRIBE_METHOD = 'SUBSCRIBE';

/**
 * Publish some data for the given topic
 * #publish
 * @param {String} topic
 * @param {Object} data
 */
Quasar.prototype.publish = function(topic, data) {

};

/**
 * Subscribe to the given topic and handle events
 * #subscribe
 * @param {String} topic
 * @param {Function} callback
 */
Quasar.prototype.subscribe = function(topic, callback) {

};

/**
 * Implements the Quasar join protocol
 * #_sendUpdatesToNeighbors
 */
Quasar.prototype._sendUpdatesToNeighbors = function() {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;

  // Update our ABF with our subscription information
  for (var g = 0; g < this._groups.length; g++) {
    this._bf.add(this._groups[g]);
  }

  // Add our negative information
  this._bf.add(nodeID);

  // Get our overlay nearest overlay neighbors
  var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

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
 * #_updateAttenuatedBloomFilter
 * @param {Array} neighbors
 * @param {Function} callback
 */
Quasar.prototype._updateAttenuatedBloomFilter = function(neighbors, callback) {
  var self = this;

  // Iterate over all the given neighbors
  async.each(neighbors, function(contact, done) {

    // If we haven't seen this contact since the TTL, then ignore
    if (contact.lastSeen > (Date.now() - self._options.ttl)) {
      return done();
    }

    // Ask the contact for their attenuated bloom filter
    self._getBloomFilterFromNeighbor(contact, function(err, atbf) {
      if (err) {
        return done();
      }

      // Merge the remote copy of the bloom filter with our own
      self._applyAttenuatedBloomFilterUpdate(atbf);
      done();
    });
  }, callback);
};

/**
 * Merges the attenuated bloom filter with our own
 * #_applyAttenuatedBloomFilterUpdate
 * @param {quasar.AttenuatedBloomFilter} atbf
 */
Quasar.prototype._applyAttenuatedBloomFilterUpdate = function(atbf) {
  // Iterate for the depth of our bitfield minus our view of neighbors
  for (var f = 1; f < this._options.bf.depth; f++) {

    // Then for each bloom filter in our neighbor's response, merge their
    // bloom filter with ours for the given "hop" in our attenuated filter
    for (var b = 0; b < atbf.filters[f].bitfield.buffer.length; b++) {
      var local = this._bf.filters[f].bitfield.buffer;
      var remote = atbf.filters[f].bitfield.buffer;

      local[b] += remote[b];
    }
  }
};

/**
 * Request a copy of the contact's attenuated bloom filter
 * #_getBloomFilterFromNeighbor
 * @param {kad.Contact} contact
 * @param {Function} callback
 */
Quasar.prototype._getBloomFilterFromNeighbor = function(contact, callback) {

};

/**
 * Send the contact our updated attenuated bloom filter
 * #_updateNeighbor
 */
Quasar.prototype._updateNeighbor = function(contact) {

};

/**
 * Inspects the message and routes it accordingly if needed
 * #_routeMessage
 * @param {kad.Message} message
 * @param {kad.Contact} contact
 * @param {Function} callback
 */
Quasar.prototype._routeMessage = function(message, contact, callback) {
  if (kad.Message.isResponse(message)) {
    return callback();
  }

  if (message.method !== Quasar.PUBLISH_METHOD) {
    return callback();
  }

  // Implement Quasar routing protocol
  // Be sure to respond with an ACK to original sender

  callback();
};

module.exports = Quasar;
