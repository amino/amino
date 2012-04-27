var agent = require('../../').init({debug: true})
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var http = require('http')
  , server = http.createServer();

server.on('request', function(req, res) {
  agent.request('agent://backend' + req.url).pipe(res);
});

var port = 3000;
server.listen(port, function() {
  agent.log('Listening on http://localhost:' + port + '/');
});