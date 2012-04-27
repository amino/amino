var EventEmitter = require('events').EventEmitter
  , util = require('util');

function Driver() {
  EventEmitter.constructor.call(this);
}
util.inherits(Driver, EventEmitter);

module.exports = Driver;