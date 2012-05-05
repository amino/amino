module.exports = function(len) {
  len = (len || 8);
  var ret = ''
    , choices = 'ABCDEFGHIJKLMNOPQRSTUVWYXZabcdefghijklmnopqrstuvwyxz0123456789'
    , retlen = 0
    , range = choices.length - 1
    ;
  while (ret.length < len) {
    ret += choices[Math.round(Math.random() * range)];
  }
  return ret;
};