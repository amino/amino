var EventEmitter = require('events').EventEmitter;
var director = require('director');

function Driver() {
  EventEmitter.constructor.call(this);
}

Driver.prototype = EventEmitter.prototype;

Driver.prototype.connect = function(options, callback) {
  throw new Error('Driver#connect must be implemented.');
}

Driver.prototype.director = director;

module.exports = Driver;