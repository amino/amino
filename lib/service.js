var rabbitjs = require('rabbit.js');
var EventEmitter = require('events').EventEmitter;
var Channel = require('./channel').Channel;

function Service(options) {
  EventEmitter.constructor.call(this);
  this._channels = {};
  this._requests = {};
  this._context = null;
  this._connected = false;
  if (!options) {
    options = {};
  }
  this._url = options.url;
};

Service.prototype = new EventEmitter();

Service.prototype._autoConnect = function(callback) {
  if (this._connected) {
    callback();
  }
  else {
    var that = this;
    var c = this._context = rabbitjs.createContext(this._url);
    c.on('ready', function() { that._connected = true; callback(); });
    c.on('error', function(err) {
      that.emit('error', err);
    });
  }
}

Service.prototype._getChannel = function(type, namespace, callback) {
  var that = this;
  this._autoConnect(function() {
    var channelType;
    switch (type) {
      case 'PUB': case 'SUB': channelType = 'event'; break;
      case 'PUSH': case 'PULL': channelType = 'queue'; break;
      case 'REQ': case 'REP': channelType = 'request'; break;
    }
    namespace = channelType + '::' + namespace;
    var key = type + '::' + namespace;
    if (!that._channels[key]) {
      that._channels[key] = new Channel(that._context, type, namespace);
    }
    callback(that._channels[key]);
  });
}

Service.prototype.publish = function(eventname, data) {
  this._getChannel('PUB', eventname, function(channel) {
    channel.write(data);
  });
};

Service.prototype.subscribe = function(eventname, callback) {
  this._getChannel('SUB', eventname, function(channel) {
    channel.read(function(message) {
      callback(message.data);
    });
  });
};

Service.prototype.unsubscribe = function(eventname, callback) {
  
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
