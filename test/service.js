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
      // Give time for the subscribe to take effect.
      setTimeout(function() {
        client.publish('nonsense', 'aefae');
        client.publish('alphabet', 'A');
        client.publish('nonsense', '23523');
        client.publish('nonsense', 'awfad');
        client.publish('alphabet', 'B');
      }, 50);
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
    describe('GET', function() {
      before(function() {
        daemon.reply('math.edu', function(req, done) {
          var parsed = require('url').parse(req.path, true);
          // Field requests.
          var input = new Number(parsed.query.input);
          var res;
          switch (parsed.pathname) {
            case '/square':
              res = {code: 200, data: Math.pow(input, 2)};
              break;
            case '/meaning-of-life':
              res = {code: 500, data: "Can't calculate!"};
              break;
            default:
              res = {code: 404, data: "Page not found"};
          }
          done(new cantina.Response(res));
        });
      });
      it('returns correct answer', function(done) {
        var input = Math.round(100 * Math.random());
        var url = '//math.edu/square?input=' + input;

        client.request(url, function(err, res) {
          assert(res.data === input * input, 'Square correctly returned');
          assert(JSON.stringify(res.data) === res.body, 'res.body is JSON of data');
          assert(res.headers['Content-Type'] === 'application/json', 'res content-type is JSON');
          assert(res.code === 200, 'response code is 200');
          done(err);
        });
      });

      it('returns 404', function(done) {
        var input = 100 * Math.random();
        var url = '//math.edu/round?input=' + input;
        client.request(url, function(err, res) {
          assert(res.data === 'Page not found', 'res.data is error message');
          assert(res.code === 404, 'res.code is 404');
          assert(err === null, 'err is null');
          done();
        });
      });

      it('returns 500', function(done) {
        var url = '//math.edu/meaning-of-life';
        client.request(url, function(err, res) {
          assert(res.data === "Can't calculate!", 'res.data is error message');
          assert(res.code === 500, 'res.code is 500');
          assert(err.code === 500, 'err.code is 500');
          assert(err.message === "Can't calculate!", 'err.message is error message');
          done();
        });
      });
    });
  });
});
