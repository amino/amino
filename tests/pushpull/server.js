var Service = require('../..').Service;
var server = new Service();

// Push letters of the alphabet to a queue.
var ids = 'ABCDEFGHIJKLMNOPQRSTUVWYXZ';
var id = 0;
setInterval(function() {
  // Send the next letter in the set.
  if (id == ids.length) {
    id = 0;
  }
  var letter = ids[id++];
  var message = {letter: letter};
  server.push('alphabet', message);
  console.log(message);
}, 1000);
