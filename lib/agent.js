var EventEmitter = require('events').EventEmitter;
var async = require('async');
var BaseDriver = require('./driver.js');

module.exports.init = function(options) {
  return new Agent(options);
};

function Agent(options) {
  EventEmitter.constructor.call(this);

  options = (options || {});
  options.plugins = (options.plugins || ['pubsub-redis', 'queue-amqp', 'req-http']);
  this.options = options;
  this.ready = false;
  this._queue = [];
  this.on('ready', function() {
    this._doQueue();
  });
  this.start();
}

Agent.prototype = new EventEmitter;

Agent.prototype._doQueue = function() {
  var args;
  while (args = this._queue.shift()) {
    var method = args.shift();
    this[method].apply(this, args);
  }
};

Agent.prototype.start = function() {
  var that = this;
  this.plugins = {};
  var tasks = [];

  this.options.plugins.forEach(function(name) {
    var plugin = that.plugins[name] = require('agent-' + name)(that, BaseDriver);

    plugin.on('error', function(err) {
      that.emit('error', err);
    });
    // Only Redis emits this event.
    plugin.on('subscribe', function(channel, count) {
      that.emit('subscribe', channel, count);
    });

    (function(plugin) {

      tasks.push(function(done) {
        plugin.connect.call(plugin, that.options[plugin] || {}, done);
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
  this.invoke('subscribe', channel, handler);
};

Agent.prototype.publish = Agent.prototype.pub = function(channel, data) {
  this.invoke('publish', channel, data);
};

Agent.prototype.queue = Agent.prototype.q = function(queue, data) {
  this.invoke('queue', queue, data);
};

Agent.prototype.process = Agent.prototype.do = function(queue, handler) {
  this.invoke('process', queue, handler);
};

Agent.prototype.request = Agent.prototype.req = function(url, handler) {
  this.invoke('request', url, handler);
};

Agent.prototype.respond = Agent.prototype.req = function(hostname, handler, onListen) {
  this.invoke('respond', hostname, handler, onListen);
};

Agent.prototype.invoke = function(method) {
  var args = Array.prototype.slice.call(arguments);
  if (this.ready) {
    args.shift();
    for (var name in this.plugins) {
      var plugin = this.plugins[name];
      if (typeof plugin[method] == 'function') {
        return plugin[method].apply(plugin, args);
      }
    }
    throw new Error ("No plugin found for method: " + method);
  }
  else {
    this._queue.push(args);
  }
};

Agent.prototype.reset = function() {
  // @todo: reset handlers, etc.
};
