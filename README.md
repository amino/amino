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

queue/process
-------------

**order-sprocket.js**

```javascript
// Add sprocket request to a queue. These things take time.
var agent = require('agent').init();

agent.on('ready', function() {
  var order = {
    type: 'sprocket-b',
    spokes: 5
  };
  agent.queue('orders', order);
  console.log('Your order is processing!');
});
agent.start();
```

**make-sprockets.js**

```javascript
// Fulfill sprocket requests.
var agent = require('agent').init();

agent.on('ready', function() {
  agent.process('orders', function(order) {
    var sprocket = new Sprocket(order);
    console.log('Created sprocket with id ' + sprocket.id);
  });
});
agent.start();
```

request/respond
---------------

**get-sprocket.js**

```javascript
// Request a sprocket from the sprocket service.
var agent = require('agent').init();

agent.on('ready', function() {
  // Agent.request() is the same as github.com/mikeal/request, except
  // it can handle the agent:// protocol, which uses virtual hostnames, defined
  // with agent.respond().
  // @see https://github.com/mikeal/request
  agent.request('agent://sprockets/af920c', function (error, response, body) {
    var sprocket = response.data;
    console.log(sprocket);
  });
  // Also usable with vanilla HTTP.
  agent.request('http://icanhazip.com/', function (error, response, body) {
    console.log('my ip is: ' + body);
  });
});
agent.start();
```

**serve-sprocket.js**

```javascript
// Create a sprocket service.
var agent = require('agent').init();

agent.on('ready', function() {
  // "sprockets" will be our virtual hostname (for requests to agent://sprockets/...)
  agent.respond('sprockets', function(router) {
    // router is a director router.
    // @see https://github.com/flatiron/director
    router.on('/:sprocketId', function(sprocketId) {
      // this.res is a http.ServerResponse object.
      // Our res.end() can also take object and status arguments,
      // which will auto-encode the JSON response for us.
      var res = this.res;
      db.sprockets.find({id: sprocketId}, function(err, sprocket) {
        res.end(sprocket);
      });
    });
  });
});
agent.start();
```
