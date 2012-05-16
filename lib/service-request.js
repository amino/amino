/**
 * A simple request object for using a service manually.
 */

var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits');

module.exports = function(amino) {

  function ServiceRequest(service, version) {
    if (version) {
      this.headers = {'x-amino-version': version};
    }
    amino.globalAgent.addRequest(this, service);
  }
  inherits(ServiceRequest, EventEmitter);

  return ServiceRequest;
};
