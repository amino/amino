function Response(data) {
  for (var prop in data) {
    this[prop] = data[prop];
  }
  this.headers = (this.headers || {});
  this.code = (this.code || null);
  this.body = (this.body || '');
}

Response.prototype.hydrate = function() {
  // Re-hydrate response data from body.
  if (this.headers['Content-Type'] === 'application/json') {
    this.data = JSON.parse(this.body);
  }
  return this;
}

Response.prototype.dehydrate = function () {
  // De-hydrate response data into body.
  if (typeof this.data != 'undefined') {
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(this.data);
    delete this.data;
  }
  return this;
}

Response.prototype.getError = function() {
  var err = null;
  if (this.code >= 500 && this.code < 600) {
    err = new Error(this.data || this.body);
    err.code = this.code;
  }
  return err;
}

module.exports.Response = Response;
