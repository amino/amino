var Service = require('../..').Service;
var client = new Service();

// Receive messages from server.js and relay to STDOUT.
client.subscribe('alphabet', function(data) {
  console.log(data);
});
