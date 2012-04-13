var context = require('rabbit.js').createContext();
var Service = require('../..').Service;
var client = new Service();

// Create the math daemon.
client.reply('math.edu', function(req, done) {
  console.log(req);
  var parsed = require('url').parse(req.path, true);
  // Field requests for square roots.
  if (parsed.pathname == '/square') {
    var data = {};
    data.pid = process.pid;
    data.input = parsed.query.input;
    data.output = Math.pow(parsed.query.input, 2);
    done(null, {code: 200, data: data});
  }
  else {
    done('Page not found', {code: 404});
  }
});
