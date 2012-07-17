var EventEmitter = require('events').EventEmitter
  , BaseDriver = require('./driver.js')
  , inherits = require('inherits')
  , nconf = require('nconf')
  , path = require('path')
  , fs = require('fs')
  , Spec = require('./spec').Spec
  ;

function Amino() {
  Amino.super.call(this);

  this._queue = {};
  this._drivers = {};
  this.confPaths = [];

  this.spec = new Spec();
  this._configure();
}
inherits(Amino, EventEmitter);

// Configure amino using nconf (options read and merged from multiple locations)
Amino.prototype._configure = function() {
  var self = this;
  nconf.argv().env();

  // Local defaults
  this.confPaths.push(path.join(__dirname, '../etc/amino.json'));
  // Global conf (if exists)
  fs.existsSync || (fs.existsSync = path.existsSync);
  if (fs.existsSync('/etc/amino.json')) {
    this.confPaths.push('/etc/amino.json');
  }
  // App-level confs
  [
    path.join(process.cwd(), 'etc/conf.json'),
    path.join(process.cwd(), 'etc/app.json'),
    path.join(process.cwd(), 'etc/amino.json')
  ].forEach(function(p) {
    if (fs.existsSync(p)) {
      self.confPaths.push(p);
    }
  });

  // Environment-specific confs
  switch (nconf.get('NODE_ENV')) {
    case 'test':
      this.confPaths.push(path.join(__dirname, '../test/test-conf.json'));
      break;
  }
  // Check for an override conf path
  if (override = nconf.get('conf')) {
    if (override[0] !== '/') {
      override = path.join(process.cwd(), override);
    }
    this.confPaths.push(override);
  }

  // Merge conf files into this.options
  nconf.use('memory', {loadFrom: this.confPaths});
  this.options = nconf.get('amino');

  ['pubsub', 'queue', 'request'].forEach(function(pattern) {
    if (self.options[pattern]) {
      self.use(pattern, 'amino-driver-' + self.options[pattern].driver, self.options[pattern].options);
    }
  });
};

// Instantiate drivers and invoke Driver#connect if necessary
Amino.prototype.use = function(pattern, moduleName, options) {
  var self = this;
  try {
    mod = require(moduleName);
  }
  catch (e) {
    // Since we're working with optionalDependencies, require may fail
    self.emit('error', new Error('Required module not found: ' + moduleName));
    return this;
  }

  var Driver = mod(this, BaseDriver);
  this._drivers[pattern] = instance = new Driver(options || {});

  instance.on('error', function(err) {
    self.emit('error', err);
  });
  // Only Redis emits this event.
  instance.on('subscribe', function(channel, count) {
    self.emit('subscribe', channel, count);
  });

  if (typeof instance.connect === 'function') {
    instance.ready = false;
    (function(pattern, instance) {
      instance.connect.call(instance, function() {
        instance.ready = true;
        self._doQueue(pattern);
      });
    })(pattern, instance);
  }
  else {
    instance.ready = true;
  }
  return this;
};

Amino.prototype.set = function(option, value) {
  nconf.set(option, value);
  return this;
};

Amino.prototype.get = function(option) {
  return nconf.get(option);
};

// Add a conf file
Amino.prototype.conf = function(confPath, relativeTo) {
  if (relativeTo) {
    confPath = path.join(relativeTo, confPath);
  }
  nconf.add(confPath, {type: 'file', file: confPath});
  return this;
};

Amino.prototype.argv = function(options) {
  nconf.use('argv', options);
  return this;
};

Amino.prototype._doQueue = function(pattern) {
  if (this._queue[pattern] && this._queue[pattern].length) {
    var self = this;
    var args = self._queue[pattern].shift();
    var method = args.shift();
    self[method].apply(self, args);
    process.nextTick(function() {
      self._doQueue(pattern);
    });
  }
};

Amino.prototype.subscribe = Amino.prototype.sub = function(channel, handler) {
  this.invoke('pubsub', 'subscribe', channel, handler);
};

Amino.prototype.publish = Amino.prototype.pub = function(channel, data) {
  this.invoke('pubsub', 'publish', channel, data);
};

Amino.prototype.unsubscribe = function(channel) {
  this.invoke('pubsub', 'unsubscribe', channel);
};

Amino.prototype.once = function(channel, handler) {
  this.invoke('pubsub', 'once', channel, handler);
};

Amino.prototype.queue = Amino.prototype.q = function(queue, data) {
  this.invoke('queue', 'queue', queue, data);
};

Amino.prototype.process = Amino.prototype.do = function(queue, handler) {
  this.invoke('queue', 'process', queue, handler);
};

Amino.prototype.request = Amino.prototype.req = function(url, handler) {
  return this.invoke('request', 'request', url, handler);
};

Amino.prototype.respond = Amino.prototype.res = function(hostname, handler) {
  return this.invoke('request', 'respond', hostname, handler);
};

Amino.prototype.invoke = function(pattern, method) {
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  if (this._drivers[pattern]) {
    var instance = this._drivers[pattern];
    if (instance.ready) {
      args.shift();

      if (typeof instance[method] == 'function') {
        return instance[method].apply(instance, args);
      }
      else {
        this.emit('error', new Error("Method not implemented: " + method));
      }
    }
    else {
      if (!this._queue[pattern]) {
        this._queue[pattern] = [];
      }
      this._queue[pattern].push(args);
    }
  }
  else {
    this.emit('error', new Error("Pattern not configured: " + pattern));
  }
};

// Return a Service instance. onSpec will be auto-bound to the 'spec' event.
Amino.prototype.createService = function(service, onSpec) {
  var service = new amino.Service(service, this.options, onSpec);
  if (onSpec) {
    service.on('spec', onSpec);
  }
  return service;
};

// Returns a request for a service.
//
// Version can be a semver string, an object containing headers, or empty.
//
// Requesters MUST bind on 'spec' and emit errors on 'error'.
Amino.prototype.requestService = function(service, version, clientId) {
  return new amino.ServiceRequest(service, version, clientId);
}

Amino.prototype.reset = function() {
  // @todo: reset handlers, etc.
};

Amino.prototype.log = function() {
  if (this.get('debug')) {
    console.log.apply(null, arguments);
  }
};

// Amino is a singleton.
var amino = module.exports = new Amino();

// Export the Spec class.
amino.Spec = Spec;

// Export the Spec agent.
amino.Agent = require('./agent')(amino);
amino.globalAgent = new amino.Agent(amino.options);

// Export the Service class.
amino.Service = require('./service')(amino);

// Export the ServiceRequest class.
amino.ServiceRequest = require('./service-request')(amino);
