Kad Quasar
==========

[![Build Status](https://img.shields.io/travis/kadtools/kad-quasar.svg?style=flat-square)](https://travis-ci.org/kadtools/kad-quasar)
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad-quasar.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad-quasar)
[![NPM](https://img.shields.io/npm/v/kad-quasar.svg?style=flat-square)](https://www.npmjs.com/package/kad-quasar)

Publish/Subscribe extension system for [Kad](https://github.com/kadtools/kad),
based on the [Quasar](http://research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf)
protocol.

Quick Start
-----------

Install kad and kad-quasar with NPM:

```bash
npm install kad kad-quasar
```

Pass your `kad.Router` to Quasar:

```js
var kad = require('kad');
var quasar = require('kad-quasar');

// setup kad contact and transport here...

var router = kad.Router({ transport: transport });

// setup kad node here...

var bus = quasar(router);

// now you can publish and subscribe
bus.subscribe('topic name', function(data) {
  console.log(data);
});

bus.publish('topic name', {
  some: 'data',
  goes: 'here'
});
```
