var amino = require('../').init();

// Publishes "cool stuff" event
setInterval(amino.publish.bind(amino, 'cool stuff', {cool: true}), 2000);