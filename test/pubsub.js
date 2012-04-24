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

describe('pub/sub', function() {
  var agent = require('../').init();
  agent.on('error', function(err) {
    throw err;
  });
  afterEach(function() {
    if (agent) {
      agent.reset();
    }
  });

  it('should only receive from the subscribed event', function(done) {
    var left = 2;
    var letters = ['A', 'B'];
    agent.on('subscribe', function(channel, count) {
      if (channel === 'alphabet') {
        agent.publish('nonsense', 'aefae');
        agent.publish('alphabet', 'A');
        agent.publish('nonsense', '23523');
        agent.publish('nonsense', 'awfad');
        agent.publish('alphabet', 'B');
      }
    });
    agent.subscribe('alphabet', function(letter) {
      if (inArray(letter, letters)) {
        if (!--left) {
          done();
        }
      }
      else {
        assert.fail(letter, letters, 'Letter not in list', 'in');
      }
    });
  });

  it('can handle objects', function(done) {
    agent.on('subscribe', function(channel, count) {
      if (channel === 'objects') {
        agent.publish('objects', {jorge: 'Ben'});
      }
    });
    agent.subscribe('objects', function(data) {
      assert.strictEqual(data.jorge, 'Ben', 'object properties can be accessed on sub');
      done();
    });
  });
});
