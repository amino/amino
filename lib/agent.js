var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  ;

module.exports = function(amino) {

  function AminoAgent(options) {
    var self = this;
    AminoAgent.super.call(this, options);

    // Throttle broadcasts at 5 seconds.
    options.specRequestThrottle = (options.specRequestThrottle || 5000);
    // Broadcast for specs every 120 seconds regardless, to pick up stragglers.
    options.specRequestInterval = (options.specRequestInterval || 120000);


    this.options = {};
    for (var prop in options) {
      this.options[prop] = options[prop];
    }
    this.requests = {};
    this.services = {};
    this.lastSpecRequest = {};

    // Initialize service. Subscribe to pub/sub channels and request specs.
    this.on('service', function(service) {
      if (!self.services[service]) {
        self.services[service] = [];
        self.requests[service] = [];
        // Listen for personal responses.
        amino.subscribe('_get:' + service + ':' + amino.spec.id, function(spec) {
          self.addSpec(new amino.Spec(spec));
        });
        // Listen for broadcasts.
        amino.subscribe('_spec:' + service, function(spec) {
          self.addSpec(new amino.Spec(spec));
        });
        if (this.options.specRequestInterval) {
          setInterval(function() {
            amino.log('Searching for straggler specs for ' + service + '...');
            self.specRequest(service);
          }, this.options.specRequestInterval);
        }
      }
    });
  }
  inherits(AminoAgent, EventEmitter);

  // Add a spec to the service's pool if it doesn't exist. Run the next request
  // if queued.
  AminoAgent.prototype.addSpec = function(spec) {
    for (var i in this.services[spec.service]) {
      if (this.services[spec.service][i].id === spec.id) {
        // Already added.
        return;
      }
    }
    amino.log('got spec ' + spec.toString());
    this.services[spec.service].push(spec);
    this.nextRequest(spec.service);
  };

  // Remove a spec from the service's pool.
  AminoAgent.prototype.removeSpec = function(spec) {
    for (var i in this.services[spec.service]) {
      if (this.services[spec.service][i].id === spec.id) {
        this.services[spec.service].splice(i, 1);
        return;
      }
    }
  };

  AminoAgent.prototype.specRequest = function(service) {
    var now = Date.now();
    if (!this.lastSpecRequest[service] || now - this.lastSpecRequest > this.options.specRequestThrottle) {
      this.lastSpecRequest = now;
      amino.publish('_get:' + service, amino.spec.id);
    }
  };

  // Entry point. ClientRequest will call this.
  AminoAgent.prototype.addRequest = function(req, host, port) {
    var service = host;
    this.emit('service', service);

    if (this.services[service].length) {
      this.doRequest(service, req);
    }
    else {
      // No available specs, queue the request and request specs.
      this.requests[service].push(req);
      amino.log('requesting initial specs for ' + service + '...');
      this.specRequest(service);
    }
  };

  // Use a spec to complete the request.
  AminoAgent.prototype.doRequest = function(service, req) {
    var self = this;
    // Use the next available spec and push it to the back of the line.
    var spec = this.services[service].shift();
    this.services[service].push(spec);

    // If an error occurs on the request, take it out of the spec pool.
    req.on('error', function(err) {
      amino.log('error with request to ' + spec.toString() + ', removing spec from rotation');
      self.removeSpec(spec);
    });

    // Emit the spec for the request to use.
    req.emit('spec', spec);

    // Do next request if queued.
    this.nextRequest(service);
  };

  // Do the next request in the queue.
  AminoAgent.prototype.nextRequest = function(service) {
    if (this.requests[service].length) {
      this.doRequest(service, this.requests[service].shift());
    }
  };

  return AminoAgent;
}
