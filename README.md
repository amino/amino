agent
=====

Clustered application creation toolkit

**agent** provides a simple API for communicating between nodes in a cluster:

- **publish/subcribe** - aka "events"
- **queue/process** - aka "job queue"
- **request/respond** - aka "REST"

Mix and match these patterns to create your own distributed application!

publish/subscribe
-----------------

**publisher.js**

```javascript
// Tell other nodes my name when I start.
var agent = require('agent')
  .use(require('agent-pubsub-redis'));

agent.publish('myname', 'agent99');
```

**subscriber.js**

```javascript
// Greet other nodes as they come up.
var agent = require('agent')
  .use(require('agent-pubsub-redis'));

agent.subscribe('myname', function(name) {
  console.log('hello, ' + name + '!');
});
```

queue/process
-------------

**order-sprocket.js**

```javascript
// Add sprocket request to a queue. These things take time.
var agent = require('agent')
  .use(require('agent-queue-amqp'));

agent.queue('orders', {type: 'sprocket-b', spokes: 5});
console.log('Your order is processing!');
```

**make-sprockets.js**

```javascript
// Fulfill sprocket requests.
var agent = require('agent')
  .use(require('agent-queue-amqp'));

agent.process('orders', function(order, next) {
  makeSprocket(order, function(err, sprocket) {
    if (sprocket) {
      console.log('Created sprocket with id ' + sprocket.id);
    }
    next(err);
  });
});
```

request/respond
---------------

**serve-sprocket.js**

```javascript
// Create a sprocket service.
var agent = require('agent')
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

agent.respond('backend', function(router, spec) {
  router.get('/', function() {
    this.res.text("Your number is... \n\n" + Math.random() + "\n\nSincerely,\n" + spec.toString());
  });
  agent.log('listening on ' + spec.toString());
});
```

**get-sprocket.js**

```javascript
// Request a sprocket from the sprocket service.
var agent = require('agent')
  .use(require('agent-req-http'))
  .use(require('agent-pubsub-redis'));

// Agent.request() is the same as github.com/mikeal/request, except
// it can handle the agent:// protocol, which uses virtual hosts defined
// with agent.respond().
agent.request('agent://sprockets/af920c').pipe(process.stdout);
```