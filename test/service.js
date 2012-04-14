var cantina = require('../')
  , assert = require('assert');

describe('Service', function() {
  var client, daemon;
  before(function() {
    client = new cantina.Service();
    daemon = new cantina.Service();
  });

  describe('pub/sub', function() {
    it('should show the alphabet letter that we published', function(done) {
      daemon.subscribe('alphabet', function(letter) {
        assert(letter === 'A', 'received letter is "A"');
        done();
      });
      client.publish('alphabet', 'A');
    });

    it('should not be too slow to receive events', function(done) {
      var samples = 200, timers = [];
      // @todo: benchmark rate of reception instead of end-to-end time
      daemon.subscribe('speed', function(started) {
        timers.push(new Date().getTime() - started);
        if (timers.length === samples) {
          console.log(timers);
          done();
        }
      });
      for (var i = 0; i < samples; i++) {
        client.publish('speed', new Date().getTime());
      }
    });
  });
});
