var agent = require('../../').init({debug: true})
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

agent.respond('backend', function(router, spec) {
  router.get('/', function() {
    this.res.text("Your number is... \n\n" + Math.random() + "\n\nSincerely,\n" + spec.toString());
  });
  agent.log('listening on ' + spec.toString());
});