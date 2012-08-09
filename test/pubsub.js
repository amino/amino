var assert = require('assert')
  , inArray = require('./helpers/inArray.js')
  ;

describe('pub/sub', function() {
  var amino = require('../');

  amino.on('error', function(err) {
    throw err;
  });
  after(function() {
    amino.reset();
  });

  it('should only receive from the subscribed event', function(done) {
    var left = 2;
    var letters = ['A', 'B'];
    amino.on('subscribe', function(channel, count) {
      if (channel === 'alphabet') {
        amino.publish('nonsense', 'aefae');
        amino.publish('alphabet', 'A');
        amino.publish('nonsense', '23523');
        amino.publish('nonsense', 'awfad');
        amino.publish('alphabet', 'B');
      }
    });
    amino.subscribe('alphabet', function(letter) {
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

  it('can unsubscribe', function(done) {
    amino.on('unsubscribe', function(channel, count) {
      if (channel === 'alphabet') {
        amino.on('alphabet', function(letter) {
          assert(false, 'unsubscribe failed');
        });
        amino.publish('alphabet', 'Z');
        setTimeout(done, 200);
      }
    });
    amino.unsubscribe('alphabet');
  });

  it('can handle objects', function(done) {
    amino.on('subscribe', function(channel, count) {
      if (channel === 'objects') {
        amino.publish('objects', {jorge: 'Ben'});
      }
    });
    amino.subscribe('objects', function(data) {
      assert.strictEqual(data.jorge, 'Ben', 'object properties can be accessed on sub');
      done();
    });
  });
});
