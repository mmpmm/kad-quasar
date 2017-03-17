Kad Quasar
==========

[![Build Status](https://img.shields.io/travis/kadtools/kad-quasar.svg?style=flat-square)](https://travis-ci.org/kadtools/kad-quasar)
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad-quasar.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad-quasar)
[![NPM](https://img.shields.io/npm/v/kad-quasar.svg?style=flat-square)](https://www.npmjs.com/package/kad-quasar)

Distributed publish-subscribe plugin for [Kad](https://github.com/kadtools/kad),
based on [Quasar](http://research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf).

Quick Start
-----------

Install kad-quasar with NPM:

```bash
npm install kad-quasar --save
```

Plugin to your existing Kad project:

```js
const kad = require('kad');
const quasar = require('kad-quasar');
const node = kad({ /* options */ });

node.plugin(quasar);

node.quasarSubscribe('topic string', (content) => {
  node.logger.info(content);
});

node.quasarPublish('topic string', {
  some: 'content'
});
```

Overview
--------

Kad Quasar extends [Kad](https://github.com/kadtools/kad) with a [publish/subscribe](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)
system, enabling different applications to run on the same overlay network.

To do this, Kad Quasar uses the routing table's contact list to build an
attenuated [bloom filter](https://en.wikipedia.org/wiki/Bloom_filter) where each
filter in the series contains topics that your node and your neighbors are
subscribed to represented in "hops" from your node.

This allows each node to maintain a view of what their neighbors are interested
in 3 hops away. Published messages are relayed to neighbors probabilistically
based on this knowledge and are appended with negative information to prevent
duplication. This forms "gravity wells" in the network around groups who are
interested in a given topic and serves to prevent flooding the network while
still maintaining a high probability that the message will be delivered to all
nodes interested.

Class: QuasarNode(options)
--------------------------

The `QuasarNode` class decorates the 
[`KademliaNode`](https://kadtools.github.io/KademliaNode.html) class in Kad. 
It creates and manages an attenuated bloom filter representing the different 
topics to which your neighboring nodes are subscribed.

### node.quasarPublish(topic[, content])

Publishes a message to your nearest neighbors on the given `topic` (and
optional) `content` object. Those neighbors, in turn, relay the message to
their neighbors in accordance with their view of the the network.

#### Parameters

* `topic` - (String) identifier for the topic
* `content` - (Mixed) additional data describing the publication

### node.quasarSubscribe(topic[, handler])

Updates our local attenuated bloom filter to reflect our interest in the topic
and notifies our neighbors to relay publications matching the topic to us. In
turn, our neighbors will provide us with their local bloom filter, so we can do
the same.

#### Parameters

* `topic` - (String) identifier for the topic
* `handler` - (Function) receives arguments `content` with published data

License
-------

Kad Quasar - Distributed publish-subscribe plugin for Kad  
Copyright (C) 2017 Gordon Hall

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see http://www.gnu.org/licenses/.
