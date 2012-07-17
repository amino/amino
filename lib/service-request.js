/**
 * A simple request object for using a service manually.
 */

var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits');

module.exports = function(amino) {

  // Version can be a semver string, an object containing headers, or empty.
  function ServiceRequest(service, version, clientId) {
    if (version) {
      if (typeof version === 'string') {
        this.headers = {'x-amino-version': version};
      }
      else {
        this.headers = version;
      }
    }
    amino.globalAgent.addRequest(this, service, clientId);
  }
  inherits(ServiceRequest, EventEmitter);

  return ServiceRequest;
};
