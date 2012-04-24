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

describe('queue', function() {
  var agent = require('../').init();
  agent.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (agent) {
      agent.reset();
    }
  });

  it('should only receive from the subscribed queue', function(done) {
    var left = 4;
    var beatles = ['Ringo', 'John', 'Paul', 'George'];
    agent.queue('u2', 'Bono');
    agent.queue('jimi', 'Hendrix');
    agent.queue('mamas', 'Cass');
    agent.queue('beatles', 'John');
    agent.queue('beatles', 'George');
    agent.queue('cream', 'Eric');
    agent.queue('beatles', 'Paul');

    agent.process('beatles', function(data, next) {
      if (inArray(data, beatles)) {
        if (!--left) {
          done();
        }
      }
      else {
        assert.fail(data, beatles, 'Name not in list', 'in');
      }
      next();
    });

    agent.queue('beatles', 'Ringo');
  });

  it('should be able to handle objects', function(done) {
    agent.queue('jazz', {name: 'Bill Evans'});

    agent.process('jazz', function(data, next) {
      assert.strictEqual(data.name, 'Bill Evans', 'Object property can be accessed');
      done();
    });
  });
});
