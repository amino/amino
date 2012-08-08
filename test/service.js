var net = require('net')
  , assert = require('assert')
  , async = require('async')
  , create_request = require('./helpers/createRequest')
  ;

describe('service', function() {
  var amino = require('../'), services;

  amino.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (amino) {
      amino.reset();
    }
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
                socket.end(data.toString() + ':' + spec.id);
              });
            });
            service.server.listen(spec.port, function() {
              cb(null, service);
            });
          });
        })(amino.createService('test'));
      });
    }
    async.parallel(tasks, function(err, results) {
      services = results;
      done();
    });
  });

  it('can load-balance', function(done) {
    var expected = [];
    services.forEach(function(service) {
      expected.push('hello:' + service.spec.id);
    });
    // Double the array to test round-robin
    services.forEach(function(service) {
      expected.push('hello:' + service.spec.id);
    });

    // Send 6 requests, so each server should get 2 requests.
    var tasks = [];
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
            var index = expected.indexOf(data);
            assert.notStrictEqual(index, -1, 'response expected');
            expected.splice(index, 1);
            cb();
          });
        })(create_request('test'));
      });
    }
    async.parallel(tasks, function(err, results) {
      assert.ifError(err);
      assert.strictEqual(expected.length, 0, 'all responses received');
      done();
    });
  });

  describe('should close', function() {
    before(function(done) {
      // Close the first two servers
      var tasks = [];
      for (var i = 0; i < 2; i++) {
        (function(service) {
          tasks.push(function(cb) {
            service.on('close', function() {
              cb();
            });
            service.close();
          });
        })(services[i]);
      }
      async.parallel(tasks, function() {
        done();
      });
    });
    it('should function with one server up', function(done) {
      var tasks = [];

      // Send 6 requests, server 3 should get all of them.
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
              assert.strictEqual(data, 'hello:' + services[2].spec.id);
              cb(null, data);
            });
          })(create_request('test'));
        });
      }
      async.parallel(tasks, function(err, results) {
        assert.strictEqual(results.length, 6, 'all responses received');
        done();
      });
    });
  });
  describe('failover', function() {
    before(function(done) {
      var tasks = [];
      tasks.push(function(cb) {
        var service = amino.createService('test@1.1.0');
        service.once('spec', function(spec) {
          service.server = net.createServer(function(socket) {
            socket.on('data', function(data) {
              socket.end(data.toString() + ':' + spec.id + ':1');
            });
          });
          service.server.listen(spec.port, function() {
            cb();
          });
        });
      });
      tasks.push(function(cb) {
        services[2].server.on('close', function() {
          cb();
        });
        services[2].server.close();
      });
      async.parallel(tasks, function() {
        done();
      });
    });
    // Failover should happen after the first failed request. Subsequent requests
    // should use the updated spec list.
    it('should failover', function(done) {
      var tasks = [], errCount = 0;

      for (var i = 0; i < 6; i++) {
        tasks.push(function(cb) {
          var req = create_request('test');
          req.on('error', function(err) {
            assert.strictEqual(err.code, 'ECONNREFUSED', 'server is down');
            errCount++;
            // wait a little bit for the failover
            setTimeout(function() {
              cb(null, 1);
            }, 10);
          });
          req.on('connect', function() {
            cb(null, 1);
          });
        });
      }

      async.series(tasks, function(err, results) {
        assert.strictEqual(errCount, 1, 'one error happened');
        assert.strictEqual(results.length, 6, '6 responses came back');
        done();
      });
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
    });
    before(function(done) {
      // Also test versioning with HTTP
      amino.respond('test@2.0.0', function(router) {
        router.get('/', function() {
          this.res.text('OK');
        });
        done();
      });
    });
    it('should respect req @1.1.0', function(done) {
      var tasks = [];

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
              cb(null, data);
            });
          })(create_request('test', '1.1.0'));
        });
      }
      async.parallel(tasks, function(err, results) {
        assert.strictEqual(results.length, 6, 'all responses received');
        done();
      });
    });
    it('should respect req @1.2.0', function(done) {
      var tasks = [];

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
              cb(null, data);
            });
          })(create_request('test', '1.2.0'));
        });
      }
      async.parallel(tasks, function(err, results) {
        assert.strictEqual(results.length, 6, 'all responses received');
        done();
      });
    });
    it('should respect ranges', function(done) {
      var tasks = [];

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
          })(create_request('test', '1.x'));
        });
      }
      async.parallel(tasks, function(err, results) {
        var version1 = [], version2 = [];
        results.forEach(function(result) {
          // We should get at least 3 responses from each server.
          if (result.match(/:1$/)) {
            version1.push(result);
          }
          else if (result.match(/:2$/)) {
            version2.push(result);
          }
        });
        assert.strictEqual(version1.length, 3, '3 responses from version 1');
        assert.strictEqual(version2.length, 3, '3 responses from version 2');
        assert.strictEqual(results.length, 6, '6 responses total');
        done();
      });
    });
    it('should work with HTTP', function(done) {
      var req = amino.request({url: 'amino://test/', headers: {'x-amino-version': '2.x'}}, function(err, response, body) {
        assert.strictEqual(body, 'OK', '2.x request made');
        done();
      });
    });
    it('unsatisfied version times out', function(done) {
      var req = amino.request({url: 'amino://test/', headers: {'x-amino-version': '3.x'}, timeout: 100}, function(err, response, body) {
        assert.strictEqual(err.code, 'ETIMEDOUT', 'request timed out');
        done();
      });
    });
  });
});

describe('manual service', function() {
  var amino = require('../'), service;

  amino.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (amino) {
      amino.reset();
    }
  });

  before(function(done) {
    var spec = new amino.Spec({service: 'foo', port: 99999, host: 'localhost'});
    service = amino.createService(spec);
    service.server = net.createServer(function(socket) {
      socket.on('data', function(data) {
        socket.end(data.toString());
      });
    });
    service.server.listen(spec.port, function() {
      done();
    });
  });

  after(function(done) {
    service.close(done);
  });

  it('can serve requests from manually created service', function(done) {
    var req = create_request('foo');
    req.on('connect', function() {
      req.write('wasssssup');
    });
    req.on('data', function(data) {
      assert.strictEqual(data, 'wasssssup', 'response expected');
      done();
    });
  });
});