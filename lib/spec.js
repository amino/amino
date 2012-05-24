var uuid = require('./uuid');

function Spec(set) {
  if (set) {
    // Parse a version out of service
    if (set.service && set.service.indexOf('@') !== -1) {
      var parts = set.service.split('@');
      this.service = parts[0];
      this.version = parts[1];
      delete set.service;
    }
    for (var prop in set) {
      this[prop] = set[prop];
    }
  }
  if (!this.id) {
    this.id = uuid();
  }
}

Spec.prototype.toString = function() {
  if (this.version) {
    return this.service + '[v' + this.version + ']@' + this.host + ':' + this.port;
  }
  else if (this.service) {
    return this.service + '@' + this.host + ':' + this.port;
  }
  else if (this.host && this.port) {
    return this.host + ':' + this.port;
  }
  return this.id;
};

module.exports.Spec = Spec;