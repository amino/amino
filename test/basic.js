var amino = require('../')
  , assert = require('assert')

describe('basic test', function () {
  it('can attach an abstract plugin', function () {
    amino
      .use(require('./fixtures/plugin'), {bar: 'boo'})
      .init({
        spec: false,
        redis: false,
        service: false,
        request: false,
        test: 5
      });

    amino.foo();
    assert.equal(amino.baz(), 'boo');
    assert.equal(amino.options.test, 5);
    assert.equal(typeof amino.id, 'string');
    assert.equal(typeof amino.utils.idgen, 'function');
    assert.equal(typeof amino.utils.copy, 'function');

    assert.equal(typeof amino.Spec, 'undefined');
    assert.equal(typeof amino.publish, 'undefined');
    assert.equal(typeof amino.subscribe, 'undefined');
    assert.equal(typeof amino.unsubscribe, 'undefined');
    assert.equal(typeof amino.createService, 'undefined');
    assert.equal(typeof amino.requestService, 'undefined');
    assert.equal(typeof amino.request, 'undefined');
  });
});