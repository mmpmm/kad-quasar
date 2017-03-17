/**
 * @module kad-quasar
 */

'use strict';

/**
 * Registers the Quasar implementation as a Kad plugin
 * @param {KademliaNode} node
 */
module.exports = function QuasarPlugin(node) {
  return new module.exports.QuasarPlugin(node);
};

/** {@link QuasarPlugin} */
module.exports.QuasarPlugin = require('./lib/plugin-quasar');

/** {@link QuasarRules} */
module.exports.QuasarRules = require('./lib/rules-quasar');

/** {@link module:constants} */
module.exports.constants = require('./lib/constants');
