var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , semver = require('semver')
  , HashRing = require('hash_ring')
  ;

module.exports = function(amino) {

  function AminoAgent(options) {
    var self = this;
    AminoAgent.super.call(this, options);

    // Throttle broadcasts at 5 seconds.
    options.specRequestThrottle = (options.specRequestThrottle || 5000);
    // Broadcast for specs every 120 seconds regardless, to pick up stragglers.
    options.specRequestInterval = (options.specRequestInterval || 120000);
    // Delay before a service is deemed "ready" after getting one or more specs
    options.serviceReadyTimeout = (options.serviceReadyTimeout || 200);

    this.options = {};
    for (var prop in options) {
      this.options[prop] = options[prop];
    }
    this.initPool();

    // Initialize service. Subscribe to pub/sub channels and request specs.
    this.on('service', function(service) {
      if (!self.services[service]) {
        self.services[service] = [];
        self.requests[service] = [];

        // Listen for personal responses.
        self.personalResponder = function(spec) {
          self.addSpec(new amino.Spec(spec));
        };
        amino.subscribe('_get:' + service + ':' + amino.spec.id, self.personalResponder);
        // Listen for broadcasts.
        self.broadcastResponder = function(spec) {
          self.addSpec(new amino.Spec(spec));
        };
        amino.subscribe('_spec:' + service, self.broadcastResponder);
        // Listen for drop broadcasts.
        self.dropBroadcastResponder = function(spec) {
          self.removeSpec(new amino.Spec(spec));
        };
        amino.subscribe('_drop:' + service, self.dropBroadcastResponder);

        if (this.options.specRequestInterval) {
          self.serviceSpecRequestIntervals[service] = setInterval(function() {
            self.specRequest(service);
          }, this.options.specRequestInterval);
        }
      }
    });
  }
  inherits(AminoAgent, EventEmitter);

  AminoAgent.prototype.initPool = function() {
    var self = this;
    if (this.services) {
      Object.keys(this.services).forEach(function(service) {
        clearInterval(self.serviceSpecRequestIntervals[service]);
        clearTimeout(self.serviceReadyTimeouts[service]);
        amino.unsubscribe('_get:' + service + ':' + amino.spec.id, self.personalResponder);
        amino.unsubscribe('_spec:' + service, self.broadcastResponder);
        amino.unsubscribe('_drop:' + service, self.dropBroadcastResponder);
      });
    }
    this.requests = {};
    this.services = {};
    this.lastSpecRequest = {};
    this.rings = {};
    this.versionRings = {};
    this.serviceReadyTimeouts = {};
    this.serviceSpecRequestIntervals = {};
  };

  // Add a spec to the service's pool if it doesn't exist. Run the next request
  // if queued.
  AminoAgent.prototype.addSpec = function(spec) {
    var self = this;
    this.emit('service', spec.service);

    for (var i in this.services[spec.service]) {
      if (this.services[spec.service][i].id === spec.id) {
        // Already added.
        return;
      }
    }
    amino.log('got spec ' + spec);

    if (!this.services[spec.service].length) {
      // Delay processing the queue a short while, to improve hash ring integrity
      // when first starting up.
      clearTimeout(this.serviceReadyTimeouts[spec.service]);
      amino.log('delaying ' + spec.service + ' readiness for ' + this.options.serviceReadyTimeout + 'ms');
      this.serviceReadyTimeouts[spec.service] = setTimeout(function() {
        amino.log(spec.service + ' service is ready');
        delete self.serviceReadyTimeouts[spec.service];
        self.createRing(spec.service);
        self.nextRequest(spec.service);
      }, this.options.serviceReadyTimeout);
    }
    this.services[spec.service].push(spec);
  };

  AminoAgent.prototype.createRing = function(service) {
    var self = this;
    this.emit('service', service);
    if (this.services[service].length) {
      var specIds = {};
      this.services[service].forEach(function(spec) {
        specIds[spec.id] = 1;
      });
      amino.log('creating ring for ' + Object.keys(specIds).length + ' ' + service + ' spec(s)');
      this.rings[service] = new HashRing(specIds);
    }
    else {
      amino.log('deleting empty ring for ' + service);
      delete this.rings[service];
    }
    // Clear the version ring cache
    delete this.versionRings[service];
  };

  AminoAgent.prototype.specFromRing = function(service, clientId, version) {
    var hashRing;
    this.emit('service', service);
    if (version) {
      // Lazily create a version-specific hash ring.
      if (typeof this.versionRings[service] === 'undefined' || typeof this.versionRings[service][version] === 'undefined') {
        var specIds = {};
        if (typeof this.versionRings[service] === 'undefined') {
          this.versionRings[service] = {};
        }
        if (typeof this.versionRings[service][version] === 'undefined') {
          this.versionRings[service][version] = {};
        }
        // Search for specs to satisfy the version.
        for (var i in this.services[service]) {
          if (this.services[service][i].version && semver.satisfies(this.services[service][i].version, version)) {
            var spec = this.services[service].slice(i, i + 1)[0];
            specIds[spec.id] = 1;
          }
        }
        if (Object.keys(specIds).length) {
          amino.log('creating versioned spec ring for ' + Object.keys(specIds).length + ' ' + service + ' spec(s) @' + version);
          this.versionRings[service][version] = new HashRing(specIds);
        }
        else {
          return null;
        }
      }
      hashRing = this.versionRings[service][version];
    }
    else {
      hashRing = this.rings[service];
    }
    if (hashRing) {
      var specId = hashRing.getNode(clientId);
      for (var i in this.services[service]) {
        if (this.services[service][i].id === specId) {
          return this.services[service][i];
        }
      }
    }
  };

  // Remove a spec from the service's pool.
  AminoAgent.prototype.removeSpec = function(spec) {
    this.emit('service', spec.service);
    for (var i in this.services[spec.service]) {
      if (this.services[spec.service][i].id === spec.id) {
        amino.log('removing spec ' + spec.toString());
        this.services[spec.service].splice(i, 1);
        this.createRing(spec.service);
        return;
      }
    }
  };

  AminoAgent.prototype.specRequest = function(service) {
    var now = Date.now();
    if (!this.lastSpecRequest[service] || now - this.lastSpecRequest > this.options.specRequestThrottle) {
      amino.log('requesting initial specs for ' + service + '...');
      this.lastSpecRequest = now;
      amino.publish('_get:' + service, amino.spec.id);
    }
  };

  // Entry point. ClientRequest will call this.
  AminoAgent.prototype.addRequest = function(req, service, clientId) {
    this.emit('service', service);
    req.clientId = clientId;

    if (this.services[service].length) {
      if (!this.serviceReadyTimeouts[service]) {
        // Service is ready
        this.doRequest(service, req);
      }
      else {
        // Delay until the service is ready
        this.requests[service].push(req);
      }
    }
    else {
      // No available specs, queue the request and request specs.
      this.requests[service].push(req);
      this.specRequest(service);
    }
  };

  // Use a spec to complete the request.
  AminoAgent.prototype.doRequest = function(service, req) {
    var self = this;
    this.emit('service', service);

    process.nextTick(function() {
      var spec, version = reqVersion(req);
      if (req.clientId) {
        // Use a consistent hashing algorithm to select the spec.
        amino.log('selecting ' + service + ' spec from ring, clientId: ' + req.clientId + ' @' + version);
        spec = self.specFromRing(service, req.clientId, version);
      }
      else if (version) {
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

      if (!req.clientId) {
        // Push the spec back onto the queue.
        self.services[service].push(spec);
      }

      // If an error occurs on the request, take it out of the spec pool.
      req.once('error', function(err) {
        if (req.url) {
          amino.log('#error (%s) on %s %s: %s', spec, req.method, req.url, JSON.stringify(err));
        }
        else {
          amino.log('#error (%s) on socket: %s', spec, JSON.stringify(err));
        }
        // Remove spec immediately, and broadcast to other agents
        self.removeSpec(spec);
        amino.publish('_drop:' + spec.service, spec);
      });

      amino.log('routing request to %s', spec);

      // Emit the spec for the request to use.
      req.emit('spec', spec);

      // Do next request if queued.
      self.nextRequest(service);
    });
  };

  // Do the next request in the queue.
  AminoAgent.prototype.nextRequest = function(service) {
    this.emit('service', service);
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