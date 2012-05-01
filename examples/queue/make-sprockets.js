// Fulfill sprocket requests.
var amino = require('..').init()
  .use(require('amino-queue-amqp'));
var id = 0;

function makeSprocket(order, done) {
  setTimeout(function() {
    order.id = ++id;
    done(null, order);
  }, Math.random() * 1000);
}

amino.process('orders', function(order, next) {
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
