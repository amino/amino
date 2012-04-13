// Request IDs from clients.
var context = require('rabbit.js').createContext();
context.on('ready', function() {
  var req = context.socket('REQ');
  req.pipe(process.stdout);
  req.connect('square', function() {
    setInterval(function() {
      var message = JSON.stringify({input: Math.round(100 * Math.random())});
      req.write(message + "\n", 'utf8');
    }, 1000);
  });
});
