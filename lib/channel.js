var EventEmitter = require('events').EventEmitter;

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
    var message = that.decodeMessage(data);
    if (!message) {
      throw new Error('Could not decode message');
    }
    var responder = that._responders[message.id];
    if (responder) {
      // one-time responder
      responder(message);
      delete that._responders[message.id];
    }
    else {
      var listeners = that._listeners;
      var len = listeners.length;
      for (var i = 0; i < len; i++) {
        listeners[i](message);
      }
    }
  });
}

Channel.prototype.generateId = function() {
  return Math.random().toString().substring(2);
}

Channel.prototype.createMessage = function(data, id) {
  var message = {};
  message.id = (id || this.generateId());
  message.timestamp = new Date().toISOString();
  message.data = data;
  return message;
}

Channel.prototype.encodeMessage = function(message) {
  return JSON.stringify(message);
}

Channel.prototype.decodeMessage = function(data) {
  return JSON.parse(data);
}

Channel.prototype.write = function(data, callback, replyTo) {
  var that = this;
  function writeAndCallback() {
    var message = that.createMessage(data, replyTo);
    if (that.type == 'REQ' && !replyTo && callback) {
      // Create a responder for the request.
      that._responders[message.id] = function(message) {
        callback(message);
      }
      that.socket.write(that.encodeMessage(message), 'utf8');
    }
    else {
      that.socket.write(that.encodeMessage(message), 'utf8');
      if (callback) callback();
    }
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

Channel.prototype.read = function(callback) {
  this._listeners.push(callback);
  if (!this._connected) {
    this.socket.connect(this.namespace, function() {
      this._connected = true;
    });
  }
}

module.exports.Channel = Channel;