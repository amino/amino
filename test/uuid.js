var uuid = require('../lib/uuid')
  , assert = require('assert')
  ;

describe('uuid', function() {
  it('creates unique IDs', function(done) {
    var ids = [], id;
    function nextTest() {
      id = uuid(7);
      assert.strictEqual(typeof id, 'string', 'id is string');
      assert.strictEqual(id.indexOf('undefined'), -1, 'no "undefined" in id');
      assert.strictEqual(ids.indexOf(id), -1, 'id is unique');
      assert.strictEqual(id.length, 7, 'id is custom length');
      ids.push(id);

      if (ids.length === 5000) {
        done();
      }
      else {
        process.nextTick(nextTest);
      }
    }
    nextTest();
  });
});