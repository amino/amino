var assert = require('assert')
  , inherits = require('inherits')
  , stream = require('stream')
  ;

function inArray(val, arr) {
  var i = arr.length;
  while (i--) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
}

function ValidationStream(str, cb) {
  this.str = str
  this.buf = ''
  this.on('data', function (data) {
    this.buf += data
  })
  this.on('end', function () {
    assert.strictEqual(this.str, this.buf)
    if (cb) cb();
  })
  this.writable = true
}
inherits(ValidationStream, stream.Stream)
ValidationStream.prototype.write = function (chunk) {
  this.emit('data', chunk)
}
ValidationStream.prototype.end = function (chunk) {
  if (chunk) emit('data', chunk)
  this.emit('end')
}

describe('request', function() {
  var amino = require('../')
    .use(require('amino-pubsub-redis'))
    .use(require('amino-request-http'));

  amino.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (amino) {
      amino.reset();
    }
  });

  before(function(done) {
    amino.respond('math.edu', function(router) {
      router.get('/square/:input', function(input) {
        var data = Math.pow(input, 2);
        this.res.json(data);
      });

      router.get('/meaning-of-life', function() {
        var data = "Can't calculate!";
        this.res.json(data, 500);
      });

      router.post('/echo', function() {
        this.res.json(this.req.body);
      });

      done();
    });
  });
  
  var posts = [], mySpec;
  before(function(done) {
    amino.respond('cloudpost', function(router, spec) {
      mySpec = spec;
      var currentId = 1;
      function getPost(id) {
        id = parseInt(id);
        for (var i in posts) {
          if (posts[i].id === id) {
            return posts[i];
          }
        }
        return null;
      }
      router.get('/posts', function() {
        var data = posts;
        this.res.json(data);
      });

      router.post('/posts/stream', {stream: true}, function() {
        var streamChunks = [], req = this.req, res = this.res;
        req.on('data', function(chunk) {
          streamChunks.push(chunk);
        });
        req.on('end', function() {
          assert.strictEqual(streamChunks.length, 4, 'correct number of chunks received');
          ['e', 'f', 'g', 'h'].forEach(function(chunk) {
            res.write(chunk);
          });
          res.end();
        });
      });

      router.get('/posts/:id', function(id) {
        var post = getPost(id);
        if (post) {
          this.res.json(post);
        }
        else {
          this.res.writeHead(404);
          this.res.end();
        }
      });

      router.post('/posts', function() {
        var post = this.req.body;
        post.id = currentId++;
        posts.push(post);

        this.res.setHeader('location', 'amino://' + this.req.headers.host.split(':')[0] + '/posts/' + post.id);
        this.res.writeHead(201);
        this.res.end();
      });

      router.put('/posts/:id', function(id) {
        var post = getPost(id);
        if (post) {
          for (var prop in this.req.body) {
            post[prop] = this.req.body[prop];
          }
        }
        else {
          post = this.req.body;
          post.id = parseInt(id);
          posts.push(post);
        }
        this.res.json(post);
      });

      router.delete('/posts/:id', function(id) {
        id = parseInt(id);
        for (var i in posts) {
          if (posts[i].id === id) {
            delete posts[i];
            break;
          }
        }
        this.res.writeHead(204);
        this.res.end();
      });
      
      done();
    });
  });

  it('returns correct answer', function(done) {
    var input = Math.round(100 * Math.random());

    amino.request('amino://math.edu/square/' + input, function(err, res, data) {
      assert.strictEqual(data, input * input, 'Square correctly returned');
      assert.ifError(err);
      done(err);
    });
  });

  it('returns 404', function(done) {
    var input = 100 * Math.random();

    amino.request('amino://math.edu/round?input=' + input, function(err, res, data) {
      assert.strictEqual(data, 'Page not found', 'res.data is error message');
      assert.strictEqual(res.statusCode, 404, 'res.code is 404');
      assert.ifError(err);
      done();
    });
  });

  it('returns 500', function(done) {
    amino.request('amino://math.edu/meaning-of-life', function(err, res, data) {
      assert.strictEqual(data, "Can't calculate!", 'res.data is error message');
      assert.strictEqual(res.statusCode, 500, 'res.code is 500');
      assert.ifError(err);
      done();
    });
  });

  it('can transparently serialize/unserialize JSON', function(done) {
    var options = {
      method: 'POST',
      url: 'amino://math.edu/echo',
      body: {some: 'pig', name: 'wilbur', age: 2, size: '20 lbs.', friends: ['charlotte', 'fern']}
    };
    amino.request(options, function(err, res, data) {
      assert.deepEqual(data, options.body, 'data returned is identical to what was sent');
      assert.ifError(err);
      done();
    });
  });

  describe('example REST server', function() {
    it('empty list', function(done) {
      amino.request('amino://cloudpost/posts', function(err, response, body) {
        assert.deepEqual(body, [], 'body is an empty array');
        assert.ifError(err);
        done();
      });
    });

    var post = {title: 'My first blog post', content: 'Hello world!'};
    it('can post', function(done) {
      amino.request({method: 'POST', url: 'amino://cloudpost/posts', body: post}, function(err, response, body) {
        assert.strictEqual(response.statusCode, 201, 'response code is 201 (created)');
        assert.ok(response.headers.location, 'has location header');
        assert.ifError(err);
        amino.request(response.headers.location, function(err, response, body) {
          assert.strictEqual(body.title, post.title, 'post title is same');
          assert.ok(body.id, 'post has an id');
          post.id = body.id;
          assert.ifError(err);
          done();
        });
      });
    });

    it('can put', function(done) {
      post.title = 'My first blog post (edited)';
      post.content = 'Goodbye earth...';
      amino.request({method: 'PUT', url: 'amino://cloudpost/posts/' + post.id, body: post}, function(err, response, body) {
        assert.strictEqual(response.statusCode, 200, 'response code is 200 (ok)');
        assert.strictEqual(body.title, post.title, 'post title was edited');
        assert.strictEqual(body.content, post.content, 'post content was edited');
        assert.strictEqual(body.id, post.id, 'id is the same');
        assert.ifError(err);
        done();
      });
    });

    it('can put a new one', function(done) {
      post.id = 1337;
      post.title = 'My second blog post!!!';
      post.content = 'This is getting boring.';
      amino.request({method: 'PUT', url: 'amino://cloudpost/posts/' + post.id, body: post}, function(err, response, body) {
        assert.strictEqual(response.statusCode, 200, 'response code is 200 (ok)');
        assert.strictEqual(body.title, post.title, 'post title was edited');
        assert.strictEqual(body.content, post.content, 'post content was edited');
        assert.strictEqual(body.id, post.id, 'id is the same');
        assert.ifError(err);
        amino.request({method: 'GET', url: 'amino://cloudpost/posts/' + post.id, body: post}, function(err, response, body) {
          assert.strictEqual(response.statusCode, 200, 'response code is 200 (ok)');
          assert.strictEqual(body.title, post.title, 'post title was edited');
          assert.strictEqual(body.content, post.content, 'post content was edited');
          assert.strictEqual(body.id, post.id, 'id is the same');
          assert.ifError(err);
          done();
        });
      });
    });

    it('can list', function(done) {
      amino.request('amino://cloudpost/posts', function(err, response, body) {
        assert.strictEqual(body.length, 2, 'two posts found');
        assert.ok(body[0].title, 'post has a title');
        assert.ifError(err);
        done();
      });
    });

    it('can delete', function(done) {
      amino.request({method: 'DELETE', url: 'amino://cloudpost/posts/2'}, function(err, response, body) {
        assert.strictEqual(response.statusCode, 204, 'response code is 204 (no content)');
        // 204 must not return a body
        assert.ifError(body);
        assert.ifError(err);
        amino.request('amino://cloudpost/posts/2', function(err, response, body) {
          assert.strictEqual(response.statusCode, 404, 'post not found');
          assert.ifError(err);
          done();
        });
      });
    });

    it('supports HTTP', function(done) {
      amino.request('http://' + mySpec.host + ':' + mySpec.port + '/posts', function(err, response, body) {
        assert.strictEqual(response.statusCode, 200, 'requests can go through standard HTTP');
        done();
      });
    });

    it('can stream data', function(done) {
      var inputStream = new ValidationStream('abcd');
      var outputStream = new ValidationStream('efgh', done);

      var options = {
        method: 'POST',
        url: 'amino://cloudpost/posts/stream',
      };

      inputStream.pipe(amino.request(options)).pipe(outputStream);

      for (var i = 0, len = inputStream.str.length; i < len; i++) {
        inputStream.write(inputStream.str[i]);
      }
      inputStream.end();
    });
  });
});
