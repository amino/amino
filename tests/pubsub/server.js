var Channel = require('../..').Channel;
var context = require('rabbit.js').createContext();

context.on('ready', function() {
  var c = new Channel(context, 'PUB', 'event::alphabet');
  // Send letters of the alphabet in order to all clients.
  var ids = 'ABCDEFGHIJKLMNOPQRSTUVWYXZ';
  var id = 0;
  setInterval(function() {
    // Send the next letter in the set.
    if (id == ids.length) {
      id = 0;
    }
    var letter = ids[id++];
    var message = {letter: letter};
    c.write(message, function() {
      console.dir(message);
    });
  }, 1000);
});