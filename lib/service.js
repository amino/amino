var rabbitjs = require('rabbit.js');
var EventEmitter = require('events').EventEmitter;
var Channel = require('./channel').Channel;
var Request = require('./request').Request;
var Response = require('./response').Response;

function Service(options) {
  EventEmitter.constructor.call(this);
  this._channels = {};
  this._context = null;
  this._connected = false;
  this._connecting = false;
  this._queue = [];
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
    this._queue.push(callback);
    if (!this._connecting) {
      var that = this;
      this._connecting = true;
      var c = this._context = rabbitjs.createContext(this._url);
      c.on('ready', function() {
        that._connected = true;
        that._connecting = false;
        function doNextCallback() {
          var cb = that._queue.shift();
          if (cb) {
            cb();
            process.nextTick(doNextCallback);
          }
        }
        doNextCallback();
      });
      c.on('error', function(err) {
        that.emit('error', err);
      });
    }
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
    callback.call(that, that._channels[key]);
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
  this._getChannel('PUSH', queuename, function(channel) {
    channel.write(data);
  });
};

Service.prototype.pull = function(queuename, callback) {
  this._getChannel('PULL', queuename, function(channel) {
    channel.read(function(message) {
      callback(message.data);
    });
  });
};

Service.prototype.request = function(url, options, callback) {
  if (arguments.length == 2) {
    callback = options;
    options = {};
  }
  var req = new Request(url, options);
  this._getChannel('REQ', req.hostname, function(channel) {
    channel.write(req, function(message) {
      var res = new Response(message.data).hydrate();
      callback(res.getError(), res);
    });
  });
};

Service.prototype.reply = function(host, callback) {
  this._getChannel('REP', host, function(channel) {
    channel.read(function(message) {
      var req = new Request(message.data);
      callback(req.hydrate(), function(res) {
        channel.write(res.dehydrate(), null, message.id);
      });
    });
  });
};

module.exports.Service = Service;
