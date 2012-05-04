module.exports = function(len) {
  len = (len || 8);
  var ret = '', choices = 'ABCDEFGHIJKLMNOPQRSTUVWYXZabcdefghijklmnopqrstuvwyxz0123456789';
  while (ret.length < len) {
    ret += choices[Math.round(Math.random() * choices.length) - 1];
  }
  return ret;
};