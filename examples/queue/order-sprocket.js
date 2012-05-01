// Add sprocket request to a queue. These things take time.
var amino = require('..').init()
  .use(require('amino-queue-amqp'));

var order = {
  type: 'sprocket-b',
  spokes: 5
};
amino.queue('orders', order);
console.log('Your order is processing!');
setTimeout(process.exit, 50);
