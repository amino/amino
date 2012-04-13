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
  });
});
