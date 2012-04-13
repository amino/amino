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
    var message = that._decode(data);
    if (!message) {
      throw new Error('Could not decode message');
    }
    if (message.replyTo) {
      // find responder callback
      var responder = that._responders[message.replyTo];
      if (!responder) {
        throw new Error('No responder found for ' + message.replyTo);
      }
      responder(message);
      delete that._responders[message.replyTo];
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

Channel.prototype._newId = function() {
  return Math.random().toString().substring(2);
}

Channel.prototype._encode = function(message) {
  return JSON.stringify(message);
}

Channel.prototype._decode = function(data) {
  return JSON.parse(data);
}

Channel.prototype.write = function(data, callback, replyTo, error) {
  var that = this;
  function writeAndCallback() {
    var message = {};
    message.id = that._newId();
    message.timestamp = new Date().toISOString();
    message.data = data;
    message.replyTo = replyTo;
    if (that.type == 'REQ' && !replyTo && callback) {
      // Create a responder for the request.
      that._responders[message.id] = function(message) {
        callback(message);
      }
      that.socket.write(that._encode(message), 'utf8');
    }
    else {
      that.socket.write(that._encode(message), 'utf8');
      if (callback) callback();
    }
  }
  if (this._connected) {
    writeAndCallback();
  }
  else {
    this.socket.connect(this.namespace, function() {
      that._connected = true;
      writeAndCallback();
    });
  }
}

Channel.prototype.read = function(callback) {
  var that = this;
  this._listeners.push(callback);
  if (!this._connected) {
    this.socket.connect(this.namespace, function() {
      that._connected = true;
    });
  }
}

module.exports.Channel = Channel;