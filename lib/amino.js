var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter

function Amino () {
  EventEmitter.call(this);
}
inherits(Amino, EventEmitter);

Amino.prototype.use = function (plugin, options) {
  plugin.attach.call(this, options);
  return this;
}

Amino.prototype.init = function (options) {
  options || (options = {});
  var self = this;
  self.options = {};
  Object.keys(options).forEach(function (k) {
    self.options[k] = options[k];
  });

  // Require core plugins unless opt-out with "false".
  ['redis', 'service', 'request'].forEach(function (plugin) {
    if (self.options[plugin] !== false) {
      self.use(require('amino-' + plugin), self.options[plugin]);
    }
  });

  return this;
}

module.exports = new Amino();