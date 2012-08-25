var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter

function Amino () {
  EventEmitter.call(this);
}
inherits(Amino, EventEmitter);

Amino.prototype.use = function (plugin, options) {
  if (typeof options === 'undefined' || typeof options === 'object') {
    options = (this.utils && this.utils.copy(options)) || options || {};
  }
  plugin.attach.call(this, options);
  return this;
};

Amino.prototype.init = function (options) {
  var amino = this;

  // Core utils.
  amino.use(require('./plugins/utils'));
  amino.options = amino.utils.copy(options);
  amino.id = amino.utils.idgen();

  // Require external core plugins unless opt-out with "false".
  ['spec', 'redis', 'service', 'request'].forEach(function (plugin) {
    if (amino.options[plugin] !== false) {
      amino.use(require('amino-' + plugin), amino.options[plugin]);
    }
  });

  return amino;
};

module.exports = new Amino();