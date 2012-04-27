var agent = require('../../').init({debug: true})
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

var http = require('http')
  , server = http.createServer();

server.on('request', function(req, res) {
  if (req.url === '/') {
    agent.request('agent://backend/rand').pipe(res);
  }
  else {
    res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    res.end('Page not found');
  }
});

var port = Math.floor(Math.random() * (50000 - 30000)) + 30000;
server.listen(port, function() {
  agent.log('Listening on http://localhost:' + port + '/');
});