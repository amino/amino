var amino = require('../').init()
  , createServer = require('http').createServer

// companion to request.js

// Create an http server.
var server = require('http').createServer(function (req, res) {
  res.end('cool stuff: ' + service.spec.id + '\n');
  console.log('served request for ' + req.method + ' ' + req.url);
});

// server's listen() method will be called by amino, with an ephemeral port.
var service = amino.createService('cool-stuff@0.1.0', server);
service.on('listening', function () {
  console.log(service.spec + ' service listening...');
});