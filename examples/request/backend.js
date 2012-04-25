var agent = require('../../').init()
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var log = function() {
  console.log.apply(this, arguments);
};

var mySpec;
agent.respond('backend', function(router) {
  router.get('/rand', function() {
    var data = {
      generator: mySpec,
      number: Math.random()
    };
    //log('responded with ' + data.number);
    this.res.json(data);
  });
}, function(spec) {
  mySpec = spec;
  log('listening on ' + agent.formatSpec(spec));
});