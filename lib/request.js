var _url = require('url');

function Request(url, options) {
  if (arguments.length == 1 && typeof url == 'object') {
    // Request is already built
    for (var prop in url) {
      this[prop] = url[prop];
    }
  }
  else {
    this.build(url, options);
  }
}

Request.prototype.build = function(url, options) {
  var parsed = _url.parse(url, true, true);
  // path should be preceded by a frontslash.
  if (parsed.path && parsed.path[0] != '/') {
    parsed.path = '/' + parsed.path;
  }
  for (var prop in parsed) {
    this[prop] = parsed[prop];
  }
  this.method = (options.method || 'GET');
  this.headers = (options.headers || {});
  this.body = options.body;
  // @todo: implement timeout
  if (!this.headers['User-Agent']) {
    // @todo: find real version
    this.headers['User-Agent'] = 'cantina/v0.0.0';
  }
}

Request.prototype.hydrate = function() {
  if (this.headers['Content-Type'] === 'application/json') {
    // Hydrate data from body.
    this.data = JSON.parse(this.body);
  }
  return this;
}

Request.prototype.dehydrate = function() {
  if (typeof this.data != 'undefined') {
    // De-hydrate data into body.
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(this.data);
    delete this.data;
  }
  return this;
}

module.exports.Request = Request;
