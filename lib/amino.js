var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter

function Amino () {
  EventEmitter.call(this);
}
inherits(Amino, EventEmitter);

Amino.prototype.use = function () {
  return this;
}

Amino.prototype.init = function () {
  return this;
}

module.exports = new Amino();