var EventEmitter = require('events').EventEmitter
  , async = require('async')
  , BaseDriver = require('./driver.js')
  , util = require('util')
  ;

module.exports.init = function(options) {
  return new Agent(options);
};

function Agent(options) {
  EventEmitter.call(this);

  options = (options || {});
  this._drivers = [];
  this._middleware = [];
  this.ready = false;
  this._queue = [];
  this.options = {};
  for (var prop in options) {
    this.options[prop] = options[prop];
  }
  this.on('ready', function() {
    this._doQueue();
  });
  
  // Start on nextTick so we can chain with use().
  var self = this;
  process.nextTick(function() {
    self.start();
  });
}
util.inherits(Agent, EventEmitter);

Agent.prototype.use = function(module, options) {
  var Driver = module(this, BaseDriver);
  this._drivers.push([Driver, options || {}]);
  return this;
};

Agent.prototype._doQueue = function() {
  var self = this;
  var args = this._queue.shift();
  if (args) {
    var method = args.shift();
    this[method].apply(this, args);
  }
  if (this._queue.length) {
    process.nextTick(function() {
      self._doQueue();
    });
  }
};

Agent.prototype.start = function() {
  var self = this;
  var tasks = [];

  this._drivers.forEach(function(driver) {
    var instance = new driver[0](driver[1]);

    instance.on('error', function(err) {
      self.emit('error', err);
    });
    // Only Redis emits this event.
    instance.on('subscribe', function(channel, count) {
      self.emit('subscribe', channel, count);
    });

    if (typeof instance.connect == 'function') {
      (function(instance) {
        tasks.push(function(done) {
          instance.connect.call(instance, done);
        });
      })(instance);
    }

    self._middleware.push(instance);
  });

  async.parallel(tasks, function(err) {
    if (err) {
      self.emit('err', err);
    }
    else {
      self.ready = true;
      self.emit('ready');
    }
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
      var driver = this._middleware[i];
      if (typeof driver[method] == 'function') {
        tmpRet = driver[method].apply(driver, args);
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
  else {
    this._queue.push(args);
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