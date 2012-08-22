var idgen = require('idgen');

exports.attach = function (options) {
  this.utils = {};
  this.utils.idgen = idgen;

  this.utils.copy = function (obj) {
    if (!obj) return {};
    var copy = {};
    Object.keys(obj).forEach(function (k) {
      copy[k] = obj[k];
    });
    return copy;
  }
};