var amino = require('../').init();

// companion to subscribe.js

// Publishes "cool stuff" event
setInterval(amino.publish.bind(amino, 'cool stuff', {cool: true}), 2000);