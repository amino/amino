var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , net = require('net')
  ;

module.exports = function(amino) {

  function Service(service, options) {
    Service.super.call(this);

    var self = this;

    self.options = options || {};
    self.spec = new amino.Spec({service: service});
    self.server = net.createServer();
    self.success = false;

    // Bubble errors up to amino.
    self.on('error', function(err) {
      amino.emit('error', err);
    });

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
        amino.subscribe('_get:' + service, function(id) {
          amino.log('responding to spec request from ' + (new amino.Spec({id: id}).toString()));
          amino.publish('_get:' + service + ':' + id, self.spec);
        });

        self.emit('spec', self.spec);
        amino.log('broadcasting as ' + self.spec.toString());
        amino.publish('_spec:' + service, self.spec);
      }
    });

    // Attempt to get my address.
    self.ipAddress(function(err, address) {
      if (err) {
        self.emit('error', new Error("Could not autodetect host! Try setting options.host manually."));
      }

      self.spec.host = address;
      self.tryPort();
    });
  };
  inherits(Service, EventEmitter);

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

  Service.prototype.close = function() {
    // @todo: publish a "close" event to remove our spec from agents.
  };

  return Service;
};
