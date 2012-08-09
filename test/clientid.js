var net = require('net')
  , assert = require('assert')
  , async = require('async')
  , create_request = require('./helpers/createRequest')
  , idgen = require('idgen')
  ;

describe('clientId', function() {
  var amino = require('../'), services;

  amino.on('error', function(err) {
    throw err;
  });
  after(function() {
    services.forEach(function(service) {
      if (service) service.close();
    });
    amino.reset();
  });

  before(function(done) {
    var tasks = [];
    // Set up 3 services to test load balancing/failover
    for (var i = 0; i < 3; i++) {
      tasks.push(function(cb) {
        (function(service) {
          service.once('spec', function(spec) {
            service.server = net.createServer(function(socket) {
              socket.on('data', function(data) {
                socket.end(data.toString() + ':' + spec.id + ':1');
              });
            });
            service.server.listen(spec.port, function() {
              cb(null, service);
            });
          });
        })(amino.createService('test@1.1.0'));
      });
    }
    async.parallel(tasks, function(err, results) {
      services = results;
      done();
    });
  });

  it('sticks to one server', function(done) {
    // Send 6 requests, which should all go to the same server.
    var tasks = [], clientId = idgen(), specId;
    for (var i = 0; i < 6; i++) {
      tasks.push(function(cb) {
        (function(req) {
          req.on('error', function(err) {
            cb(err);
          });
          req.on('connect', function() {
            req.write('hello');
          });
          req.on('data', function(data) {
            if (specId) {
              assert.strictEqual(data.split(':')[1], specId, 'requests routed to only one spec');
            }
            specId = data.split(':')[1];
            cb();
          });
        })(create_request('test', null, clientId));
      });
    }
    async.parallel(tasks, function(err, results) {
      assert.ifError(err);
      done();
    });
  });

  describe('can close a server', function() {
    before(function(done) {
      // Close one of the servers
      services[0].on('close', function() {
        done();
      });
      service[0].close();
    });
  });
  describe('versioning', function() {
    before(function(done) {
      var service = amino.createService('test@1.2.0');
      service.once('spec', function(spec) {
        service.server = net.createServer(function(socket) {
          socket.on('data', function(data) {
            socket.end(data.toString() + ':' + spec.id + ':2');
          });
        });
        service.server.listen(spec.port, function() {
          done();
        });
      });
      services.push(service);
    });
    it('should respect req @1.1.0', function(done) {
      var tasks = [], clientId = idgen(), specId;

      // Send 6 requests @1.1.0
      for (var i = 0; i < 6; i++) {
        tasks.push(function(cb) {
          (function(req) {
            req.on('error', function(err) {
              assert.ifError(err);
            });
            req.on('connect', function() {
              req.write('hello');
            });
            req.on('data', function(data) {
              assert(data.match(/:1$/), 'response has ":1" at the end');
              if (specId) {
                assert.strictEqual(data.split(':')[1], specId, 'requests routed to only one spec');
              }
              specId = data.split(':')[1];
              cb(null, data);
            });
          })(create_request('test', '1.1.0', clientId));
        });
      }
      async.parallel(tasks, function(err, results) {
        assert.strictEqual(results.length, 6, 'all responses received');
        done();
      });
    });
    it('should respect req @1.2.0', function(done) {
      var tasks = [], clientId = idgen(), specId;

      // Send 6 requests @1.2.0
      for (var i = 0; i < 6; i++) {
        tasks.push(function(cb) {
          (function(req) {
            req.on('error', function(err) {
              assert.ifError(err);
            });
            req.on('connect', function() {
              req.write('hello');
            });
            req.on('data', function(data) {
              assert(data.match(/:2$/), 'response has ":2" at the end');
              if (specId) {
                assert.strictEqual(data.split(':')[1], specId, 'requests routed to only one spec');
              }
              specId = data.split(':')[1];
              cb(null, data);
            });
          })(create_request('test', '1.2.0', clientId));
        });
      }
      async.parallel(tasks, function(err, results) {
        assert.strictEqual(results.length, 6, 'all responses received');
        done();
      });
    });
    it('should respect ranges', function(done) {
      var tasks = [], clientId = idgen(), specId;

      // Send 6 requests @1.x
      for (var i = 0; i < 6; i++) {
        tasks.push(function(cb) {
          (function(req) {
            req.on('error', function(err) {
              assert.ifError(err);
            });
            req.on('connect', function() {
              req.write('hello');
            });
            req.on('data', function(data) {
              cb(null, data);
            });
          })(create_request('test', '1.x', clientId));
        });
      }
      async.parallel(tasks, function(err, results) {
        results.forEach(function(result) {
          if (specId) {
            assert.strictEqual(result.split(':')[1], specId, 'requests routed to only one spec');
          }
          specId = result.split(':')[1];
        });
        assert.strictEqual(results.length, 6, '6 responses total');
        done();
      });
    });
  });
});
