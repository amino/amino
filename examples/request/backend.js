var amino = require('../../')
  .set('debug')
  .use(require('amino-request-http'))
  .use(require('amino-pubsub-redis'));

amino.respond('backend', function(router, spec) {
  router.get('/', function() {
    this.res.text("Your number is... \n\n" + Math.random() + "\n\nSincerely,\n" + spec.toString());
  });
  amino.log('listening on ' + spec.toString());
});