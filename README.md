agent
=====

Clustered application creation toolkit

**agent** provides a simple API for communicating between nodes in a cluster:

- **publish/subcribe** - aka "events"
- **queue/process** - aka "job queue"
- **request/respond** - aka "REST"

Mix and match these patterns to create your own distributed application!

pub/sub
-------

**publisher.js**

```javascript
// Tell other nodes my name when I start.
var agent = require('agent').init();
    
agent.on('ready', function() {
  agent.publish('myname', 'agent99');
});
agent.start();
```

**subscriber.js**

```javascript
// Greet other nodes as they come up.
var agent = require('agent').init();

agent.on('ready', function() {
  agent.subscribe('myname', function(name) {
    console.log('hello, ' + name + '!');
  });
});
agent.start();
```

defer/process
-------------

**request-sprocket.js**

```javascript
// Add sprocket request to a queue. These things take time.
var agent = require('agent').init();

agent.on('ready', function() {
  var sprocket_request = {
    type: 'sprocket-b',
    spokes: 5
  };
  agent.queue('sprocket-request', sprocket_request);
  console.log('Your sprocket is processing!');
});
agent.start();
```

**make-sprockets.js**

```javascript
// Fulfill sprocket requests.
var agent = require('agent').init();

agent.on('ready', function() {
  agent.process('sprocket-request', function(sprocket_request) {
    var sprocket = new Sprocket(sprocket_request);
    console.log('Created sprocket with id ' + sprocket.id);
  });
});
agent.start();
```

request/serve
---------------

**get-sprocket.js**

```javascript
// Request a sprocket from the sprocket service.
var agent = require('agent').init();

agent.on('ready', function() {
  agent.request('agent://sprockets/af920c', function (error, response, body) {
    var sprocket = response.data;
    console.log(sprocket);
  });
  agent.request('http://icanhazip.com/', function (error, response, body) {
    console.log('my ip is: ' + body);
  });
});
agent.start();
```

**serve-sprocket.js**

```javascript
// Help serve sprockets.
var agent = require('agent').init();

agent.on('ready', function() {
  agent.respond('sprockets', function(router) {
    // router is a director router.
    // @see https://github.com/flatiron/director
    router.on('/:sprocketId', function(sprocketId) {
      var res = this.res;
      db.sprockets.find({id: sprocketId}, function(err, sprocket) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sprocket));
      });
    });
  });
});
agent.start();
```
