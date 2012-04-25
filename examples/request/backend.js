var agent = require('../../').init()
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var mySpec;
agent.respond('backend', function(router) {
  router.get('/rand', function() {
    var data = {
      generator: mySpec,
      number: Math.random()
    };
    console.log('responded with ' + data.number);
    this.res.json(data);
  });
}, function(spec) {
  mySpec = spec;
  console.log('listening on ' + agent.formatSpec(spec));
});