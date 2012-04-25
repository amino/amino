var agent = require('../../').init()
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));
var http = require('http')
  , server = http.createServer();

server.on('request', function(req, res) {
  var timeStart = Date.now();
  if (req.url === '/') {
    agent.request('agent://backend/rand', function(err, response, body) {
      if (err) {
        res.writeHead(500, {'content-type': 'text/plain; charset=utf-8'});
        res.end('Error! whoops....' + err);
      }
      else {
        res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'});
        console.log('response from ' + body.generator + ' in ' + Math.round(Date.now() - timeStart) + 'ms');
        res.end("Your number is... \n\n" + body.number + "\n\nSincerely,\n" + body.generator);
      }
    });
  }
  else {
    res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    res.end('Page not found');
  }
});

var port = Math.floor(Math.random() * (50000 - 30000)) + 30000;
server.listen(port, function() {
  console.log('Listening on http://localhost:' + port + '/');
});