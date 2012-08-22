var amino = require('../').init();

// companion to publish.js

// Subscribes to "cool stuff" event
amino.subscribe('cool stuff', function (stuff) {
  console.log('stuff.cool = ' + stuff.cool);
});