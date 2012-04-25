var agent = require('../../').init()
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var spec;
agent.respond('backend', function(router) {
  router.get('/rand', function() {
    var data = {
      generator: spec.id,
      number: Math.random()
    };
    console.log('responded with ' + data.number);
    this.res.json(data);
  });
}, function(agentSpec) {
  spec = agentSpec;
  console.log('Listening on ' + spec.host + ':' + spec.port);
});