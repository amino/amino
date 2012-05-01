amino
=====

Clustered application creation toolkit

**amino** provides a simple API for communicating between nodes in a cluster:

- **publish/subcribe** - aka "events"
- **queue/process** - aka "job queue"
- **request/respond** - aka "REST"

Mix and match these patterns to create your own distributed application!

publish/subscribe
-----------------

**publisher.js**

```javascript
// Tell other nodes my name when I start.
var amino = require('amino')
  .use(require('amino-pubsub-redis'));

amino.publish('myname', 'amino99');
```

**subscriber.js**

```javascript
// Greet other nodes as they come up.
var amino = require('amino')
  .use(require('amino-pubsub-redis'));

amino.subscribe('myname', function(name) {
  console.log('hello, ' + name + '!');
});
```

queue/process
-------------

**order-sprocket.js**

```javascript
// Add sprocket request to a queue. These things take time.
var amino = require('amino')
  .use(require('amino-queue-amqp'));

amino.queue('orders', {type: 'sprocket-b', spokes: 5});
console.log('Your order is processing!');
```

**make-sprockets.js**

```javascript
// Fulfill sprocket requests.
var amino = require('amino')
  .use(require('amino-queue-amqp'));

amino.process('orders', function(order, next) {
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
var amino = require('amino')
  .use(require('amino-request-http'))
  .use(require('amino-pubsub-redis'));

amino.respond('sprockets', function(router, spec) {
  // router is a director router.
  // @see https://github.com/flatiron/director
  router.get('/:id', function(id) {
    // amino adds the helpers json(), text(), and html().
    this.res.json({id: id});
  });
});
```

**get-sprocket.js**

```javascript
// Request a sprocket from the sprocket service.
var amino = require('amino')
  .use(require('amino-request-http'))
  .use(require('amino-pubsub-redis'));

// amino.request() is the same as github.com/mikeal/request, except
// it can handle the amino:// protocol, which uses virtual hosts defined
// with amino.respond().
amino.request('amino://sprockets/af920c').pipe(process.stdout);
```