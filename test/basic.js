var amino = require('../')
  , assert = require('assert')

describe('basic test', function () {
  it('can attach and init plugins', function () {
    amino
      .use(require('./fixtures/plugin'), {bar: 'boo'})
      .init({redis: false, service: false, request: false, test: 5});

    amino.foo();
    assert.equal(amino.baz(), 'boo');
    assert.equal(amino.options.test, 5);
  });
});