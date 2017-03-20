'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const kad = require('kad');
const QuasarPlugin = require('../lib/plugin-quasar');


describe('QuasarPlugin', function() {

  const identity = kad.utils.getRandomKeyBuffer();
  const router = new kad.RoutingTable(identity);
  const use = sinon.stub();

  before(function() {
    let numContacts = 32;

    while (numContacts > 0) {
      router.addContactByNodeId(kad.utils.getRandomKeyString(), {
        hostname: 'localhost',
        port: 8080
      });
      numContacts--;
    }
  });

  describe('@constructor', function() {

    it('should add middleware, self to filter, decorate node', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(use.callCount).to.equal(3);
      expect(
        use.calledWithMatch(QuasarPlugin.PUBLISH_METHOD)
      ).to.equal(true);
      expect(
        use.calledWithMatch(QuasarPlugin.SUBSCRIBE_METHOD)
      ).to.equal(true);
      expect(use.calledWithMatch(QuasarPlugin.UPDATE_METHOD)).to.equal(true);
      expect(plugin.filter[0].has(identity.toString('hex'))).to.equal(true);
      use.reset();
    });

  });

  describe('@property neighbors', function() {

    it('should return ALPHA contact objects', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(plugin.neighbors).to.have.lengthOf(kad.constants.ALPHA);
    });

  });

  describe('@method quasarPublish', function() {



  });

  describe('@method quasarSubscribe', function() {



  });

  describe('@method pullFilters', function() {



  });

  describe('@method pullFilterFrom', function() {



  });

  describe('@method pushFilters', function() {



  });

  describe('@method pushFilterTo', function() {



  });

  describe('@method isSubscribedTo', function() {

    it('should return true if subscribed and handling', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[0].add('local topic');
      plugin.groups.set('local topic', true);
      expect(plugin.isSubscribedTo('local topic')).to.equal(true);
    });

    it('should return false if not subscribed and handling', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(plugin.isSubscribedTo('local topic')).to.equal(false);
    });

  });

  describe('@hasNeighborSubscribedTo', function() {

    it('should return true if a neighbor is subscribed', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[2].add('neighbor topic');
      expect(plugin.hasNeighborSubscribedTo('neighbor topic')).to.equal(true);
    });

    it('should return false if a neighbor is not subscribed', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[2].add('neighbor topic');
      expect(plugin.hasNeighborSubscribedTo('wrong topic')).to.equal(false);
    });

  });

  describe('@private _getRandomContact', function() {

    it('should return a random contact', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      let firstResult = plugin._getRandomContact();
      expect(firstResult[0]).to.not.equal(plugin._getRandomContact()[0]);
    });

  });

});
