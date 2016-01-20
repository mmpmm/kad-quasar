/**
 * @class AttenuatedBloomFilter
 */

'use strict';

var assert = require('assert');
var BloomFilter = require('bloem').Bloem;

/**
 * Implements an Attenuated Bloom Filter
 * @constructor
 * @param {Number} size
 * @param {Number} depth
 */
function AttenuatedBloomFilter(size, depth) {
  if (!(this instanceof AttenuatedBloomFilter)) {
    return new AttenuatedBloomFilter(size, depth);
  }

  assert(typeof size === 'number', 'Invalid size parameter');
  assert(typeof depth === 'number', 'Invalid depth parameter');

  this.size = size;
  this.depth = depth;
  this.filters = [];

  for (var i = 0; i < depth; i++) {
    this.filters.push(new BloomFilter(size, 2));
  }
}

module.exports = AttenuatedBloomFilter;
