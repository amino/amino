var amino = require('../')
  , EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , net = require('net')
  , assert = require('assert')
  ;

function MockRequest(service) {
  var self = this;
  self.once('spec', function(spec) {
    self.socket = net.createConnection(spec.port, function() {
      self.emit('connect');
    });
    self.socket.on('data', function(data) {
      self.emit('data', data);
    });
    self.socket.setEncoding('utf8');
  });
  amino.globalAgent.addRequest(this, service);
};
inherits(MockRequest, EventEmitter);

MockRequest.prototype.write = function() {
  this.socket.write.apply(this.socket, arguments);
};

MockRequest.prototype.end = function() {
  this.socket.end.apply(this.socket, arguments);
};

describe('service', function() {
  var services = [];
  before(function(done) {
    // Set up 3 services to test load balancing/failover
    var left = 3;
    for (var i = 0; i < 3; i++) {
      var service = amino.createService('test');

      (function(service) {
        service.once('spec', function(spec) {
          service.server = net.createServer(function(socket) {
            socket.on('data', function(data) {
              socket.end(data.toString() + ':' + spec.id);
            });
          });
          service.server.listen(spec.port, function() {
            if (!--left) {
              done();
            }
          });
        });
      })(service);

      services.push(service);
    }
  });

  it('can load-balance', function(done) {
    var expected = [], left = 6;
    services.forEach(function(service) {
      expected.push('hello:' + service.spec.id);
    });
    // Double the array to test round-robin
    services.forEach(function(service) {
      expected.push('hello:' + service.spec.id);
    });

    // Send 6 requests, so each server should get 2 requests.
    for (var i = 0; i < 6; i++) {
      var req = new MockRequest('test');

      (function(req) {
        req.on('connect', function() {
          req.write('hello');
        });
        req.on('data', function(data) {
          var index = expected.indexOf(data);
          assert.notStrictEqual(index, -1, 'response expected');
          expected.splice(index, 1);
          if (!--left) {
            assert.strictEqual(expected.length, 0, 'all responses received');
            done();
          }
        });
      })(req);
    }
  });
});