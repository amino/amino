var amino = require('../').init();

// companion to service.js

// Requests "cool-stuff" service
setInterval(function () {
  amino.request('cool-stuff@0.1.x', '/').pipe(process.stdout);
}, 2000);