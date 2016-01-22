'use strict';

var expect =  require('chai').expect;
var BloomFilter = require('../lib/bloomfilter');

describe('BloomFilter', function() {

  describe('@constructor', function() {

    it('should create instance without the new keyword', function() {
      expect(BloomFilter(2, 2)).to.be.instanceOf(BloomFilter);
    });

    it('should create instance with the new keyword', function() {
      expect(new BloomFilter(2, 2)).to.be.instanceOf(BloomFilter);
    });

    it('should throw with invalid size', function() {
      expect(function() {
        return new BloomFilter(null, 2);
      }).to.throw(Error, 'Invalid size parameter');
    });

    it('should throw with invalid depth', function() {
      expect(function() {
        return new BloomFilter(2, null);
      }).to.throw(Error, 'Invalid depth parameter');
    });

    it('should create n bloom filters', function() {
      var bf = new BloomFilter(160, 20);
      expect(bf.filters.length).to.equal(20);
      expect(bf.filters[0].bitfield.buffer.length).to.equal(20);
    });

  });

});
