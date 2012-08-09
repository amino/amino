var assert = require('assert')
  , inArray = require('./helpers/inArray')
  ;

describe('queue', function() {
  var amino = require('../');

  amino.on('error', function(err) {
    throw err;
  });
  after(function() {
    amino.reset();
  });

  it('should only receive from the subscribed queue', function(done) {
    var left = 4;
    var beatles = ['Ringo', 'John', 'Paul', 'George'];
    amino.queue('u2', 'Bono');
    amino.queue('jimi', 'Hendrix');
    amino.queue('mamas', 'Cass');
    amino.queue('beatles', 'John');
    amino.queue('beatles', 'George');
    amino.queue('cream', 'Eric');
    amino.queue('beatles', 'Paul');

    amino.process('beatles', function(data, next) {
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

    amino.queue('beatles', 'Ringo');
  });

  it('should be able to handle objects', function(done) {
    amino.queue('jazz', {name: 'Bill Evans'});

    amino.process('jazz', function(data, next) {
      assert.strictEqual(data.name, 'Bill Evans', 'Object property can be accessed');
      done();
    });
  });
});
