// Fulfill sprocket requests.
var agent = require('..').init()
  .use(require('agent-queue-amqp'));
var id = 0;

function makeSprocket(order, done) {
  setTimeout(function() {
    order.id = ++id;
    done(null, order);
  }, Math.random() * 1000);
}

agent.process('orders', function(order, next) {
  makeSprocket(order, function(err, sprocket) {
    if (err) {
      next(err);
    }
    else {
      console.log('Created sprocket with id ' + sprocket.id);
      next();
    }
  });
});
