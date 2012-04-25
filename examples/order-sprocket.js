// Add sprocket request to a queue. These things take time.
var agent = require('..').init()
  .use(require('agent-queue-amqp'));

var order = {
  type: 'sprocket-b',
  spokes: 5
};
agent.queue('orders', order);
console.log('Your order is processing!');
setTimeout(process.exit, 50);
