var amino = require('../').init();

// Requests "cool-stuff" service
setInterval(function () {
  amino.request('cool-stuff@0.1.x', '/', function (err, res, body) {
    console.log('body: ' + body);
  });
}, 2000);