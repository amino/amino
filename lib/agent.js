var EventEmitter = require('events').EventEmitter;
var async = require('async');
var BaseDriver = require('./driver.js');

module.exports.init = function(options) {
  return new Agent(options);
};

function Agent(options) {
  EventEmitter.constructor.call(this);

  options = (options || {});
  this._middlewareModules = (options.middleware || []);
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
  var that = this;
  process.nextTick(function() {
    that.start();
  });
}

Agent.prototype = new EventEmitter;

Agent.prototype.use = function(module) {
  if (this.ready) {
    this.emit('error', new Error("Too late to add agent middleware"));
  }
  else {
    this._middlewareModules.push(module);
  }
  return this;
};

Agent.prototype._doQueue = function() {
  var args;
  while (args = this._queue.shift()) {
    var method = args.shift();
    this[method].apply(this, args);
  }
};

Agent.prototype.start = function() {
  var that = this;
  var tasks = [];

  this._middlewareModules.forEach(function(module) {
    var plugin = module(that, BaseDriver);
    that._middleware.push(plugin);

    plugin.on('error', function(err) {
      that.emit('error', err);
    });
    // Only Redis emits this event.
    plugin.on('subscribe', function(channel, count) {
      that.emit('subscribe', channel, count);
    });

    (function(plugin) {

      tasks.push(function(done) {
        plugin.connect.call(plugin, that.options[plugin.name] || {}, done);
      });

    })(plugin);
  });

  async.parallel(tasks, function(err) {
    if (err) {
      that.emit('err', err);
    }
    else {
      that.ready = true;
      that.emit('ready');
    }
  });
};

Agent.prototype.subscribe = Agent.prototype.sub = function(channel, handler) {
  return this.invoke('subscribe', channel, handler);
};

Agent.prototype.publish = Agent.prototype.pub = function(channel, data) {
  return this.invoke('publish', channel, data);
};

Agent.prototype.unsubscribe = function(channel) {
  return this.invoke('unsubscribe', channel);
};

Agent.prototype.once = function(channel, handler) {
  return this.invoke('once', channel, handler);
};

Agent.prototype.queue = Agent.prototype.q = function(queue, data) {
  return this.invoke('queue', queue, data);
};

Agent.prototype.process = Agent.prototype.do = function(queue, handler) {
  return this.invoke('process', queue, handler);
};

Agent.prototype.request = Agent.prototype.req = function(url, handler) {
  return this.invoke('request', url, handler);
};

Agent.prototype.respond = Agent.prototype.req = function(hostname, handler) {
  return this.invoke('respond', hostname, handler);
};

Agent.prototype.invoke = function(method) {
  var args = Array.prototype.slice.call(arguments);
  var ret, tmpRet;
  if (this.ready) {
    args.shift();

    var matched = false;
    for (var i in this._middleware) {
      var plugin = this._middleware[i];
      if (typeof plugin[method] == 'function') {
        tmpRet = plugin[method].apply(plugin, args);
        if (typeof ret === 'undefined' && typeof tmpRet !== undefined) {
          ret = tmpRet;
        }
        matched = true;
      }
    }
    if (!matched) {
      throw new Error("No plugin found for method: " + method);
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