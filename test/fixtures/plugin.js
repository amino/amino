// An example plugin.
exports.attach = function (options) {
  var amino = this;

  this.foo = function () {
    amino.bar = options.bar;
  };

  this.baz = function () {
    return amino.bar;
  };
};