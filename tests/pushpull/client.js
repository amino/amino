var context = require('rabbit.js').createContext();
var Service = require('../..').Service;
var client = new Service();

// Pull messages from the queue and relay to STDOUT.
client.pull('alphabet', function(data) {
  console.log(data);
});
