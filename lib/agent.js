var EventEmitter = require('events').EventEmitter
  , async = require('async')
  , BaseDriver = require('./driver.js')
  , inherits = require('inherits')
  ;

function Agent() {
  Agent.super.call(this);

  this.options = {};
  this._connectQueue = [];
  this._commandQueue = [];
  this._middleware = [];
  this._used = [];
  this.ready = true;
  var self = this;
  this.on('ready', function() {
    self._doQueue();
  });
}
inherits(Agent, EventEmitter);

// Instantiate drivers and add to connect queue if they implement Driver#connect.
Agent.prototype.use = function(mod, options) {
  var self = this;
  if (typeof mod === 'string') {
    mod = require(mod);
  }
  if (this._used.indexOf(mod) === -1) {
    var Driver = mod(this, BaseDriver);
    var instance = new Driver(options || {});

    instance.on('error', function(err) {
      self.emit('error', err);
    });
    // Only Redis emits this event.
    instance.on('subscribe', function(channel, count) {
      self.emit('subscribe', channel, count);
    });

    if (typeof instance.connect === 'function') {
      if (this.ready) {
        this.ready = false;
        this.connect();
      }
      this._connectQueue.push(instance);
    }
    else {
      this._middleware.push(instance);
    }
    this._used.push(mod);
  }
  return this;
};

Agent.prototype.set = function(option, value) {
  // flag-style set
  if (typeof value === 'undefined') {
    value = true;
  }
  this.options[option] = value;
  return this;
};

Agent.prototype._doQueue = function() {
  if (this._commandQueue.length) {
    var self = this;
    var args = self._commandQueue.shift();
    var method = args.shift();
    self[method].apply(self, args);
    process.nextTick(function() {
      self._doQueue();
    });
  }
};

Agent.prototype.connect = function() {
  var self = this;
  process.nextTick(function() {
    var tasks = [];
    var instance;
    while (instance = self._connectQueue.shift()) {

      (function(instance) {
        tasks.push(function(done) {
          instance.connect.call(instance, done);
        });
      })(instance);

      self._middleware.push(instance);
    }

    async.parallel(tasks, function(err) {
      if (err) {
        self.emit('err', err);
      }
      else {
        self.ready = true;
        self.emit('ready');
      }
    });
  });
};

Agent.prototype.subscribe = Agent.prototype.sub = function(channel, handler) {
  this.invoke('subscribe', channel, handler);
};

Agent.prototype.publish = Agent.prototype.pub = function(channel, data) {
  this.invoke('publish', channel, data);
};

Agent.prototype.unsubscribe = function(channel) {
  this.invoke('unsubscribe', channel);
};

Agent.prototype.once = function(channel, handler) {
  this.invoke('once', channel, handler);
};

Agent.prototype.queue = Agent.prototype.q = function(queue, data) {
  this.invoke('queue', queue, data);
};

Agent.prototype.process = Agent.prototype.do = function(queue, handler) {
  this.invoke('process', queue, handler);
};

Agent.prototype.request = Agent.prototype.req = function(url, handler) {
  return this.invoke('request', url, handler);
};

Agent.prototype.respond = Agent.prototype.req = function(hostname, handler) {
  this.invoke('respond', hostname, handler);
};

Agent.prototype.invoke = function(method) {
  var args = Array.prototype.slice.call(arguments);
  var ret, tmpRet;
  if (this.ready) {
    args.shift();

    var matched = false;
    for (var i in this._middleware) {
      var instance = this._middleware[i];
      if (typeof instance[method] == 'function') {
        tmpRet = instance[method].apply(instance, args);
        if (typeof ret === 'undefined' && typeof tmpRet !== undefined) {
          ret = tmpRet;
        }
        matched = true;
      }
    }
    if (!matched) {
      throw new Error("No driver found for method: " + method);
    }
  }
  else if (method === 'request') {
    throw new Error("Agent is not connected and Agent#request cannot be queued");
  }
  else {
    this._commandQueue.push(args);
  }
  return ret;
};

Agent.prototype.reset = function() {
  // @todo: reset handlers, etc.
};

Agent.prototype.log = function() {
  if (this.options.debug) {
    console.log.apply(null, arguments);
  }
};

// Agent is a singleton.
module.exports = new Agent();