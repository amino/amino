var stream = require('stream')
  , assert = require('assert')
  , util = require('util')
  ;

function ValidationStream(str, cb) {
  this.str = str
  this.buf = ''
  this.on('data', function (data) {
    this.buf += data
  })
  this.on('end', function () {
    assert.strictEqual(this.str, this.buf)
    if (cb) cb();
  })
  this.writable = true
}
util.inherits(ValidationStream, stream.Stream);
module.exports = ValidationStream;

ValidationStream.prototype.write = function (chunk) {
  this.emit('data', chunk)
}
ValidationStream.prototype.end = function (chunk) {
  if (chunk) emit('data', chunk)
  this.emit('end')
}