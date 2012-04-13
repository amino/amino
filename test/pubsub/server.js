var Service = require('../..').Service;
var server = new Service();

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
  server.publish('alphabet', message);
  console.log(message);
}, 1000);
