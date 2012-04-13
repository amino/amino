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
  var parsed = require('url').parse(url, false, true);
  // path should be preceded by a frontslash.
  if (parsed.path && parsed.path[0] != '/') {
    parsed.path = '/' + parsed.path;
  }
  req = {
    host: parsed.hostname,
    method: (options.method || 'GET'),
    path: parsed.path,
    headers: (options.headers || {}),
    body: options.body
  };
  if (!req.headers['User-Agent']) {
    // @todo: find real version
    req.headers['User-Agent'] = 'cantina/v0.0.0';
  }
  if (typeof options.data != 'undefined' && !req.body) {
    // De-hydrate request data into body.
    req.headers['Content-Type'] = 'application/json';
    req.body = JSON.stringify(options.data);
    delete options.data;
  }
  this._getChannel('REQ', req.host, function(channel) {
    channel.write(req, function(message) {
      // Re-hydrate response data from body.
      if (message.data.headers['Content-Type'] == 'application/json') {
        message.data.data = JSON.parse(message.data.body);
      }
      callback(message.error, message.data);
    });
  });
};

Service.prototype.reply = function(host, callback) {
  this._getChannel('REP', host, function(channel) {
    channel.read(function(message) {
      if (message.data.headers['Content-Type'] == 'application/json') {
        // Re-hydrate request data from body.
        message.data.data = JSON.parse(message.data.body);
      }
      callback(message.data, function(err, res) {
        res.code = (res.code || null);
        res.headers = (res.headers || {});
        res.body = (res.body || null);
        // De-hydrate response data into body.
        if (typeof res.data != 'undefined' && !res.body) {
          res.headers['Content-Type'] = 'application/json';
          res.body = JSON.stringify(res.data);
          delete res.data;
        }
        channel.write(res, null, message.id, err);
      });
    });
  });
};

module.exports.Service = Service;
