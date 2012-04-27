var agent = require('../../').init({debug: true})
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

agent.respond('backend', function(router, spec) {
  router.get('/rand', function() {
    var data = {
      generator: spec.toString(),
      number: Math.random()
    };
    //log('responded with ' + data.number);
    this.res.json(data);
  });
  agent.log('listening on ' + spec.toString());
});