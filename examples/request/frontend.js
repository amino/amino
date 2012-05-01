var amino = require('../../')
  .set('debug')
  .use(require('amino-request-http'))
  .use(require('amino-pubsub-redis'));

var http = require('http')
  , server = http.createServer();

server.on('request', function(req, res) {
  amino.request('amino://backend' + req.url, function(err, response, body) {
    if (err) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end("Could not fulfill request. Please try again later.");
    }
  }).pipe(res);
});

var port = 3000;
server.listen(port, function() {
  amino.log('Listening on http://localhost:' + port + '/');
});