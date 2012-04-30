var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  ;

function Driver() {
  Driver.super.call(this);
}
inherits(Driver, EventEmitter);

module.exports = Driver;