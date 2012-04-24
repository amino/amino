var assert = require('assert');

function inArray(val, arr) {
  var i = arr.length;
  while (i--) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
}

describe('request', function() {
  var agent = require('../').init();
  agent.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (agent) {
      agent.reset();
    }
  });
  var posts = [];

  before(function(done) {
    agent.respond('math.edu', function(router) {
      router.get('/square/:input', function(input) {
        var data = Math.pow(input, 2);
        this.res.writeHead(200, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });

      router.get('/meaning-of-life', function() {
        var data = "Can't calculate!";
        this.res.writeHead(500, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });

      router.post('/echo', function() {
        this.res.writeHead(200, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(this.req.body));
      });
    }, function() {
      done();
    });
  });
  
  before(function(done) {
    agent.respond('cloudpost', function(router) {
      router.get('/posts/:id', function(id) {
        console.log(this);
        this.res.writeHead(500, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });

      router.post('/posts', function() {
        console.log(this);
        //posts.push()
        this.res.writeHead(200, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });

      router.put('/posts/:id', function(id) {
        console.log(this);
        this.res.writeHead(500, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });

      router.delete('/posts/:id', function(id) {
        console.log(this);
        this.res.writeHead(500, {'Content-Type': 'application/json'});
        this.res.end(JSON.stringify(data));
      });
    }, function() {
      done();
    });
  });

  it('returns correct answer', function(done) {
    var input = Math.round(100 * Math.random());

    agent.request('agent://math.edu/square/' + input, function(err, res, data) {
      assert.strictEqual(data, input * input, 'Square correctly returned');
      assert.ifError(err);
      done(err);
    });
  });

  it('returns 404', function(done) {
    var input = 100 * Math.random();

    agent.request('agent://math.edu/round?input=' + input, function(err, res, data) {
      assert.strictEqual(data, 'Page not found', 'res.data is error message');
      assert.strictEqual(res.statusCode, 404, 'res.code is 404');
      assert.ifError(err);
      done();
    });
  });

  it('returns 500', function(done) {
    agent.request('agent://math.edu/meaning-of-life', function(err, res, data) {
      assert.strictEqual(data, "Can't calculate!", 'res.data is error message');
      assert.strictEqual(res.statusCode, 500, 'res.code is 500');
      assert.ifError(err);
      done();
    });
  });

  it('can transparently serialize/unserialize JSON', function(done) {
    var options = {
      method: 'POST',
      url: 'agent://math.edu/echo',
      body: {some: 'pig'}
    };
    agent.request(options, function(err, res, data) {
      assert.strictEqual(data, options, 'data returned is identical to what was sent');
      assert.ifError(err);
      done();
    });
  });
});
