Amino
=====

Clustering framework

[![build status](https://secure.travis-ci.org/cantina/amino.png)](http://travis-ci.org/cantina/amino)

Idea
----

Amino is a toolkit for building scalable, fault-taulerant apps in Node.js.

Features:

  - fast pub/sub
  - decentralized service registry
  - load-balancing
  - graceful failover
  - no single point of failure

Example
-------

```javascript

// ### Configuration
var amino = require('amino').init({redis: "localhost:6379"});

// ### pub/sub

amino.subscribe('cool stuff', function (stuff) {
  // stuff.cool == true
});

amino.publish('cool stuff', {cool: true});

// ### services

var server = require('http').createServer(function (req, res) {
  res.end('cool stuff');
});
var service = amino.createService('cool-stuff@0.1.0', server);

amino.request('amino://cool-stuff/', function (err, res, body) {
  // body == 'cool stuff'
});

```