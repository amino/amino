// Field requests for square roots, and sign them with a client ID.
var context = require('rabbit.js').createContext();
context.on('ready', function() {
  var rep = context.socket('REP');
  rep.setEncoding('utf8');
  rep.connect('square', function() {
    rep.on('data', function(message) {
      message = JSON.parse(message);
      message.pid = process.pid;
      message.output = Math.pow(message.input, 2);
      rep.write(JSON.stringify(message) + "\n", 'utf8');
    });
  });
});
