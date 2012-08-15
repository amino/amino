var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , net = require('net')
  ;

module.exports = function(amino) {

  function Service(service, options) {
    Service.super.call(this);
    this.setMaxListeners(0);

    var self = this;
    this.closing = false;

    self.options = options || {};

    // Bubble errors up to amino.
    self.on('error', function(err) {
      amino.emit('error', err);
    });

    if (typeof service == 'object') {
      // If a full spec is passed in, use that.
      self.spec = service;
      self.publishSpec();
    }
    else {
      // Get a host/port by configuration and/or discovery.
      self.spec = new amino.Spec({service: service});
      self.server = net.createServer();
      self.success = false;

      // Close the server immediately, now that we have a port to use.
      self.once('listen', function() {
        self.success = true;
        self.server.close();
      });

      // If listening fails with EADDRINUSE, try another port.
      self.server.on('error', function (err) {
        if (err.code == 'EADDRINUSE' && !self.options.port) {
          amino.log('port ' + self.spec.port + ' in use, trying another...');
          setTimeout(function() {
            self.tryPort();
          }, 1000);
        }
        else {
          self.emit('error', err);
        }
      });

      // Publish the spec (including port)
      self.server.on('close', function() {
        if (self.success) {
          self.publishSpec();
        }
      });

      // Attempt to get my address.
      self.ipAddress(function(err, address) {
        if (err) {
          self.emit('error', new Error("could not autodetect host! Try setting options.host manually."));
        }

        self.spec.host = address;
        self.tryPort();
      });
    }

    // Unpublish our spec if process closes.
    self.processListeners = {
      SIGINT: self.onTerminate('SIGINT'),
      SIGKILL: self.onTerminate('SIGKILL'),
      SIGTERM: self.onTerminate('SIGTERM')
    };
    process.setMaxListeners(0);
    for (var sig in self.processListeners) {
      process.on(sig, self.processListeners[sig]);
    }
  };
  inherits(Service, EventEmitter);

  // Publish our spec.
  Service.prototype.publishSpec = function() {
    var self = this;
    this.responder = function responder(id) {
      amino.log('(' + self.spec + ') responding to spec request from ' + (new amino.Spec({id: id})));
      amino.publish('_get:' + self.spec.service + ':' + id, self.spec);
    };
    amino.subscribe('_get:' + self.spec.service, this.responder);
    self.emit('spec', self.spec);
    amino.log('broadcasting as ' + self.spec);
    amino.publish('_spec:' + self.spec.service, self.spec);
  };

  // Create a handler for process termination on a certain signal.
  Service.prototype.onTerminate = function(signal) {
    var self = this;
    return function() {
      // Close the server when process is terminated.
      self.close(function() {
        if (!process.listeners(signal).length) {
          process.exit();
        }
      });
    };
  };

  // Attempt to listen on a port. If none specified, try a random port within range.
  Service.prototype.tryPort = function() {
    var self = this;

    if (!self.options.port) {
      self.spec.port = Math.floor(Math.random() * (self.options.range[1] - self.options.range[0])) + self.options.range[0];
    }
    else {
      self.spec.port = self.options.port;
    }

    self.server.listen(self.spec.port, function() {
      self.emit('listen');
    });
  };

  // Get my IP address.
  Service.prototype.ipAddress = function(done) {
    var self = this;
    if (!self.options.host) {
      require('dns').lookup(require('os').hostname(), function (err, address, fam) {
        if (!err) {
          self.options.host = address;
        }
        done(err, self.options.host);
      });
    }
    else {
      done(null, self.options.host);
    }
  };

  // Close the service, unpublishing spec and shutting down the server (if we
  // started one)
  Service.prototype.close = function(cb) {
    var self = this;
    if (this.closing) {
      cb && cb();
      return;
    }
    amino.log('closing ' + self.spec);
    this.closing = true;
    if (this.responder) {
      amino.unsubscribe('_get:' + self.spec.service, this.responder);
    }
    amino.publish('_drop:' + self.spec.service, self.spec);
    amino.publish('_close:' + self.spec.service, self.spec);

    // If the server is manually closed, we don't want an event listener leak.
    for (var sig in self.processListeners) {
      process.removeListener(sig, self.processListeners[sig]);
    }

    if (cb) {
      self.on('close', cb);
    }
    if (self.server) {
      self.server.on('close', function() {
        self.emit('close');
      });
      try {
        self.server.close();
      }
      catch (e) {
        // Server probably already closed. Oh well...
        self.emit('close');
      }
    }
    else {
      self.emit('close');
    }
  };

  return Service;
};
