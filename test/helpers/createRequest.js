var amino = require('../../')
  , net = require('net')
  ;

module.exports = function createRequest(service, version, clientId) {
  var req = amino.requestService(service, version, clientId);
  req.once('spec', function(spec) {
    req.socket = net.createConnection(spec.port, function() {
      req.emit('connect');
    });
    req.socket.on('data', function(data) {
      req.emit('data', data);
    });
    req.socket.on('error', function(err) {
      req.emit('error', err);
    });
    req.socket.setTimeout(100);
    req.socket.setEncoding('utf8');
  });
  req.write = function() {
    req.socket.write.apply(req.socket, arguments);
  };
  req.end = function() {
    req.socket.end.apply(req.socket, arguments);
  };
  return req;
}