'use strict';

const constants = require('./constants');
const kad = require('kad');
const BloomFilter = require('atbf');
const LruCache = require('lru-cache');
const QuasarRules = require('./rules-quasar');


/**
 * Implements the primary interface for the publish-subscribe system
 * and decorates the given node object with it's public methods
 */
class QuasarPlugin {

  /**
   * @constructor
   * @param {KademliaNode} node
   */
  constructor(node) {
    const handlers = new QuasarRules(this);

    this.cached = new LruCache(constants.LRU_CACHE_SIZE)
    this.groups = new Map();
    this.filter = new BloomFilter({
      filterDepth: constants.FILTER_DEPTH,
      bitfieldSize: kad.constants.B
    });

    this.node = node;
    this.node.quasarSubscribe = this.quasarSubscribe.bind(this);
    this.node.quasarPublish = this.quasarPublish.bind(this);

    this.node.use('PUBLISH', handlers.publish.bind(handlers));
    this.node.use('UPDATE', handlers.update.bind(handlers));
    this.node.use('SUBSCRIBE', handlers.subscribe.bind(handlers));
    this.filter[0].add(node.identity.toString('hex'));
  }

  /**
   * Publishes the content to the network
   * @param {string} topic - Identifier for subscribers
   * @param {object} content - Arbitrary publication payload
   * @param {function} [callback]
   */
  quasarPublish(topic, content) {

  }

  /**
   * Publishes the content to the network
   * @param {string} topic - Identifier for subscribers
   * @param {object} content - Arbitrary publication payload
   * @param {function} [callback]
   */
  quasarSubscribe(topic, content) {

  }

}

module.exports = QuasarPlugin;
