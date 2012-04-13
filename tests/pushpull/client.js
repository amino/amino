// Pull messages from the queue and relay to STDOUT.
var context = require('rabbit.js').createContext();
context.on('ready', function() {
  var sub = context.socket('PULL');
  sub.pipe(process.stdout);
  sub.connect('alphabet');
});
