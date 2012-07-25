var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  ;

function Driver() {
  Driver.super.call(this);
  this.setMaxListeners(0);
}
inherits(Driver, EventEmitter);

module.exports = Driver;