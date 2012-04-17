var cantina = require('../')
  , assert = require('assert');

function inArray(val, arr) {
  var i = arr.length;
  while (i--) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
}

describe('Service', function() {
  var client, daemon;
  before(function() {
    client = new cantina.Service();
    daemon = new cantina.Service();
  });

  describe('pub/sub', function() {
    it('should only receive from the subscribed event', function(done) {
      var left = 2;
      var letters = ['A', 'B'];
      daemon.subscribe('alphabet', function(letter) {
        if (inArray(letter, letters)) {
          if (!--left) {
            done();
          }
        }
        else {
          assert.fail(letter, letters, 'Letter not in list', 'in');
        }
      });
      client.publish('nonsense', 'aefae');
      client.publish('alphabet', 'A');
      client.publish('nonsense', '23523');
      client.publish('nonsense', 'awfad');
      client.publish('alphabet', 'B');
    });
  });

  describe('push/pull', function() {
    it('should only receive from the subscribed queue', function(done) {
      var left = 4;
      var beatles = ['Ringo', 'John', 'Paul', 'George'];
      daemon.pull('beatles', function(name) {
        if (inArray(name, beatles)) {
          if (!--left) {
            done();
          }
        }
        else {
          assert.fail(name, beatles, 'Name not in list', 'in');
        }
      });
      client.push('u2', 'Bono');
      client.push('beatles', 'Ringo');
      client.push('jimi', 'Hendrix');
      client.push('mamas', 'Cass');
      client.push('beatles', 'John');
      client.push('beatles', 'George');
      client.push('cream', 'Eric');
      client.push('beatles', 'Paul');
    });
  });

  describe('req/rep', function() {
    it('should respond with the correct answer', function(done) {
      var input = Math.round(100 * Math.random());
      var url = '//math.edu/square?input=' + input;
      client.reply('math.edu', function(req, done) {
        var parsed = require('url').parse(req.path, true);
        // Field requests for square roots.
        if (parsed.pathname == '/square') {
          done(null, {code: 200, data: Math.pow(parsed.query.input, 2)});
        }
        else {
          done('Page not found', {code: 404});
        }
      });

      client.request(url, function(err, res) {
        assert(res.data === input * input, 'Square correctly returned');
        done(err);
      });
    });
  });
});
