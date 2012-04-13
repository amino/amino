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
  this._subscriptions = [];
  this._requests = [];
  this._socketCache = [];
  this._keepAlive = (options.keepalive || 15000);
  this._garbageCollect();
};

Service.prototype = new EventEmitter();

Service.prototype._garbageCollect = function() {
  var that = this;
  setInterval(function() {
    var socketCache = this._socketCache;
    var len = socketCache.length;
    for (var i = 0; i < len; i++) {
      if (socketCache[i].socket == socket) {
        
      }
    }
    this._socketCache = socketCache;
  }, 1000);
}

// Mark a socket as written to, otherwise it will be GC'd.
Service.prototype._touchSocket = function(socket) {
  socket.last = Date.now();
}

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

function Channel(context, type, namespace, options) {
  EventEmitter.constructor.call(this);
  this._context = context;
  this.type = type;
  this.last = null;
  this.namespace = namespace;
  this._initSocket();
  this._connected = false;
  this._listeners = [];
  this._responders = {};
}

Channel.prototype = new EventEmitter();

Channel.prototype._initSocket = function() {
  var that = this;
  this.socket = this._context.socket(this.type);
  this.socket.setEncoding('utf8');
  this.socket.on('data', function(data) {
    var message = that.decodeData(data);
    if (!message) {
      throw new Error('Could not decode message');
    }
    var responder = that._responders[message.id];
    if (responder) {
      // one-time responder
      responder(message.data);
      delete that._responders[message.id];
    }
    else {
      var listeners = that._listeners;
      var len = listeners.length;
      for (var i = 0; i < len; i++) {
        listeners[i](message.data);
      }
    }
  });
}

Channel.prototype.generateId = function() {
  return Math.random().toString().substring(2);
}

Channel.prototype.encodeData = function(data, id) {
  var message = {};
  message.id = (id || this.generateId());
  message.timestamp = new Date().toISOString();
  message.data = data;
  return JSON.stringify(message);
}

Channel.prototype.decodeData = function(data) {
  return JSON.parse(data);
}

Channel.prototype._write = function(id, data, callback) {
  var that = this;
  function writeAndCallback() {
    that.socket.write(that.encodeData(data, id), 'utf8');
    if (callback) callback();
  }
  if (this._connected) {
    writeAndCallback();
  }
  else {
    this.socket.connect(this.namespace, function() {
      this._connected = true;
      writeAndCallback();
    });
  }
}

Channel.prototype.write = function(data, callback) {
  return this._write(null, data, callback);
}

Channel.prototype.respond = Channel.prototype._write;

Channel.prototype.read = function(callback) {
  this._listeners.push(callback);
  if (!this._connected) {
    this.socket.connect(this.namespace, function() {
      this._connected = true;
    });
  }
}

module.exports.Channel = Channel;