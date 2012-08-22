var amino = require('../').init()
  , createServer = require('http').createServer

// Creates an amino service

var server = require('http').createServer(function (req, res) {
  res.end('cool stuff: ' + service.spec.id);
  console.log('served request for ' + req.method + ' ' + req.url);
});

// server's listen() method will be called by amino.
var service = amino.createService('cool-stuff@0.1.0', server);
service.on('listening', function () {
  console.log(service.spec + ' service listening...');
});