var Channel = require('../..').Channel;
var context = require('rabbit.js').createContext();

// Receive messages from server.js and relay to STDOUT.
context.on('ready', function() {
  var c = new Channel(context, 'SUB', 'event::alphabet');
  c.read(function(message) {
    console.dir(message.data);
  });
});
