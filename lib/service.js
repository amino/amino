var EventEmitter = require('events').EventEmitter;
var rabbitjs = require('rabbit.js');

function Service(url, options) {
  EventEmitter.constructor.call(this);
  var that = this;
  var c = this._context = rabbitjs.createContext(url);
  c.on('ready', function() { that.emit('ready') });
  c.on('error', function(err) {
    that.emit('error', err);
  });
  this._channels = [];
  this._requests = [];
};

Service.prototype = new EventEmitter();

// Return a cached or new socket.
Service.prototype._socketCache = function(type, namespace) {
  var socketCache = this._socketCache;
  var len = socketCache.length;
  for (var i = 0; i < len; i++) {
    if (socketCache[i].type == type && socketCache[i].namespace == namespace) {

      return socketCache[i].socket;
    }
  }
  this._socketCache = socketCache;
}

Service.prototype.publish = function(eventname, data) {
  
  socket.connect(eventname, function() {
    socket.write(JSON.stringify(data), 'utf8');
  });
  this._advertisements.push({namespace: 'event::' + eventname, socket: socket});
};

Service.prototype.subscribe = function(eventname, callback) {
  var socket = this._context.socket('SUB');
  socket.setEncoding('utf8');
  socket.connect(eventname, function() {
    socket.on('data', function(data) {
      callback(JSON.parse(data));
    });
  });
  this._subscriptions.push({namespace: 'event::' + eventname, callback: callback, socket: socket});
};

Service.prototype.unsubscribe = function(eventname, callback) {
  this._unsubscribe('event::' + eventname, callback);
}

Service.prototype._unsubscribe = function(namespace, callback) {
  var subs = this._subscriptions;
  var len = subs.length;
  for (var i = 0; i < len; i++) {
    var sub = subs[i];
    if (namespace && sub.namespace != namespace) {
      continue;
    }
    if (callback && sub.callback != callback) {
      continue;
    }
    sub.socket.destroy();
    subs.splice(i, 1);
  }
  this._subscriptions = subs;
}

Service.prototype.push = function(queuename, data) {
  var socket = this._context.socket('PUSH');
  socket.connect(queuename, function() {
    socket.write(JSON.stringify(data), 'utf8');
    socket.destroy();
  });
};

Service.prototype.shift = function(queuename, callback) {
  var socket = this._context.socket('PULL');
  socket.setEncoding('utf8');
  socket.connect(queuename, function() {
    socket.on('data', function(data) {
      callback(JSON.parse(data));
    });
  });
  this._subscriptions.push({namespace: 'queue::' + queuename, callback: callback, socket: socket});
};

Service.prototype.request = function(url, options, callback) {
  // url = "stp://hostname/path?query";
  // options = {
  //   method: "GET",
  //   data: {my: data}
  // };
  // callback(err, response)
  if (arguments.length == 2) {
  	callback = options;
  	options = {};
  }
  // Default method is "GET"
  options.method = (options.method || 'GET');
  // Parse url for hostname and path.
  var parsed = require('url').parse(url);
  parsed.hostname = (parsed.hostname || 'localhost');
  if (parsed.path[0] != '/') {
    parsed.path = '/' + parsed.path;
  }
  parsed.path += parsed.search;
  var socket = this._context.socket('REQ');
  socket.connect(queuename, function() {
    socket.write(JSON.stringify(data), 'utf8');
  });
};
Service.prototype.reply = function(hostname, callback) {
  // callback(req, resp, next)
};

module.exports.Service = Service;
