// Fulfill sprocket requests.
var agent = require('..').init();
var id = 0;

function makeSprocket(order, done) {
  setTimeout(function() {
    order.id = ++id;
    done(null, order);
  }, Math.random() * 5000);
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
