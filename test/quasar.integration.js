'use strict';

var expect = require('chai').expect;
var kad = require('kad');
var Quasar = require('../lib/quasar');

describe('Quasar', function() {

  var PORT = 65535;
  var NUM_NODES = 30;
  var NODES = [];
  var Q_NODES = [];

  function createTestNodeOnPort(port) {
    var logger = new kad.Logger(0);
    var contact = new kad.contacts.AddressPortContact({
      address: '127.0.0.1',
      port: port
    });
    var transport = new kad.transports.UDP(contact, {
      logger: logger
    });
    var router = new kad.Router({
      transport: transport,
      logger: logger
    });
    var node = new kad.Node({
      transport: transport,
      router: router,
      logger: logger,
      storage: new kad.storage.MemStore()
    });
    return node;
  }

  function getRandomQuasarNode() {
    return Q_NODES[Math.floor(Math.random() * Q_NODES.length)];
  }

  while (NUM_NODES > 0) {
    NODES.push(createTestNodeOnPort(PORT--));
    NUM_NODES--;
  }

  NODES.forEach(function(node, i) {
    if (i) {
      node.connect(NODES[i - 1]._self);
    }
    Q_NODES[i] = Quasar(NODES[i]._router);
  });

  describe('Integration', function() {

    it('all subscribers should receive a publication', function(done) {
      var count = 0;

      var publishers = [
        getRandomQuasarNode(),
        getRandomQuasarNode(),
        getRandomQuasarNode()
      ];

      var subscribers = [
        getRandomQuasarNode(),
        getRandomQuasarNode(),
        getRandomQuasarNode()
      ];

      function test() {
        if (count === subscribers.length) {
          done();
        }
      }

      subscribers[0].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      subscribers[1].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      subscribers[2].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      publishers[0].publish('test', {
        test: 'Hello world!'
      });
    });

    it('subscribers should receive multiple publication', function(done) {
      var count = 0;

      var publishers = [
        getRandomQuasarNode(),
        getRandomQuasarNode(),
        getRandomQuasarNode()
      ];

      var subscribers = [
        getRandomQuasarNode(),
        getRandomQuasarNode(),
        getRandomQuasarNode()
      ];

      function test() {
        if (count === subscribers.length) {
          done();
        }
      }

      subscribers[0].subscribe('foo', function(data) {
        expect(data.test).to.equal('baz');
        count++;
        test();
      });

      subscribers[0].subscribe('bar', function(data) {
        expect(data.test).to.equal('baz');
        count++;
        test();
      });

      subscribers[0].subscribe('baz', function(data) {
        expect(data.test).to.equal('foo');
        count++;
        test();
      });

      publishers[0].publish('bar', {
        test: 'baz'
      });

      publishers[1].publish('foo', {
        test: 'baz'
      });

      publishers[2].publish('baz', {
        test: 'foo'
      });
    });

  });

});
