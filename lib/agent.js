var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , semver = require('semver')
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
        // Listen for broadcasts.
        amino.subscribe('_drop:' + service, function(spec) {
          self.removeSpec(new amino.Spec(spec));
        });
        if (this.options.specRequestInterval) {
          setInterval(function() {
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
        amino.log('removing spec ' + spec.toString());
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
    this.emit('service', host);

    if (this.services[host].length) {
      this.doRequest(host, req);
    }
    else {
      // No available specs, queue the request and request specs.
      this.requests[host].push(req);
      amino.log('requesting initial specs for ' + host + '...');
      this.specRequest(host);
    }
  };

  // Use a spec to complete the request.
  AminoAgent.prototype.doRequest = function(service, req) {
    var self = this, spec;

    process.nextTick(function() {
      var version = reqVersion(req);
      if (version) {
        // Search for a spec to satisfy the request.
        for (var i in self.services[service]) {
          if (self.services[service][i].version && semver.satisfies(self.services[service][i].version, version)) {
            spec = self.services[service].splice(i, 1)[0];
            break;
          }
        }
      }
      else {
        // Use the next available spec.
        spec = self.services[service].shift();
      }

      if (!spec) {
        // Between ticks, the last spec must've been removed (or semver hasn't
        // been satisfied). Defer till more specs come in.
        self.requests[service].push(req);
        return;
      }

      // Push the spec back onto the queue.
      self.services[service].push(spec);

      // If an error occurs on the request, take it out of the spec pool.
      req.once('error', function(err) {
        amino.log('#error on ' + req.method + ' ' + req.url + ': ' + JSON.stringify(err));
        amino.publish('_drop:' + spec.service, spec);
      });

      // Emit the spec for the request to use.
      req.emit('spec', spec);

      // Do next request if queued.
      self.nextRequest(service);
    });
  };

  // Do the next request in the queue.
  AminoAgent.prototype.nextRequest = function(service) {
    if (this.requests[service].length) {
      this.doRequest(service, this.requests[service].shift());
    }
  };

  return AminoAgent;
}

function reqVersion(req) {
  var headers = (req.headers || req._headers || {});
  for (var prop in headers) {
    if (prop.toLowerCase() === 'x-amino-version') {
      return headers[prop];
    }
  }
}