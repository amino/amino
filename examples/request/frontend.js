var agent = require('../../')
  .set('debug')
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var http = require('http')
  , server = http.createServer();

server.on('request', function(req, res) {
  agent.request('agent://backend' + req.url, function(err, response, body) {
    if (err) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end("Could not fulfill request. Please try again later.");
    }
  }).pipe(res);
});

var port = 3000;
server.listen(port, function() {
  agent.log('Listening on http://localhost:' + port + '/');
});