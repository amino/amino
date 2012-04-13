var Service = require('../..').Service;
var server = new Service();

// Farm out square root calculations to math daemon.
setInterval(function() {
  var url = '//math.edu/square?input=' + Math.round(100 * Math.random());
  console.log('GET ' + url);
  server.request(url, function(err, res) {
    if (err) {
      console.error('error: ' + err);
    }
    else {
      console.log(res);
    }
  });
}, 1000);
