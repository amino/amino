var uuid = require('./uuid');

function Spec(set) {
  if (set) {
    for (var prop in set) {
      this[prop] = set[prop];
    }
  }
  if (!this.id) {
    this.id = uuid();
  }
}

Spec.prototype.toString = function() {
  if (this.service) {
    return this.service + '@' + this.host + ':' + this.port;
  }
  else if (this.host && this.port) {
    return this.host + ':' + this.port;
  }
  return this.id;
};

module.exports.Spec = Spec;