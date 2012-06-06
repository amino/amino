Amino
=====

Clustered application creation toolkit

Idea
----

Amino is a toolkit for building scalable, fault-taulerant apps in Node.js.
By using its simple API, you can harness the power of pub/sub, job queuing,
and auto-load-balancing without any of the fuss and dependence on particular
technologies.

The API provides:

  - **pubsub** -- Use `amino.publish()` and `amino.subscribe()` to send events
    between nodes in your cluster. (default driver: [redis](https://github.com/mranney/node_redis))
  - **queue** -- Use `amino.queue()` and `amino.process()` to queue jobs and
    process them. (default driver: [amqp](https://github.com/postwait/node-amqp), i.e. RabbitMQ)
  - **request** -- Use `amino.request()` and `amino.respond()` to easily create REST
    APIs with auto-load-balancing and failover. (default driver: HTTP, uses pub/sub)
  - **service** -- Advanced: Use `amino.createService()` to register a service, and receive a port
    to listen on. This allows you to create generic TCP services.

Setup
-----

If you have redis and RabbitMQ servers running locally on the default ports, all
you need to get started is:

```bash
$ npm install amino
```

```javascript
var amino = require('amino');

// Use amino API
```

Amino uses a configuration file (in JSON format) to determine what drivers to use. It looks
like this (default conf located in `etc/amino.json`)

```json
{
  "amino": {
    "pubsub": {
      "driver": "redis",
      "options": {
        "host": "localhost",
        "port": 6379
      }
    },
    "queue": {
      "driver": "amqp",
      "options": {
        "url": "amqp://localhost"
      }
    },
    "request": {
      "driver": "http"
    },
    "range": [50000, 60000]
  }
}
```

To override this, you can do:

```bash
$ node myapp.js --conf /path/to/my/amino.json
```

Or to use a system-wide conf, you can put one at `/etc/amino.json`.

__At the moment, there are no other selectable drivers. More coming soon!__

API
---

### publish/subscribe

**publisher.js**

```javascript
// Tell other nodes my name when I start.
var amino = require('amino');

amino.publish('myname', 'amino99');
```

**subscriber.js**

```javascript
// Greet other nodes as they come up.
var amino = require('amino');

amino.subscribe('myname', function(name) {
  console.log('hello, ' + name + '!');
});
```

### queue/process

**order-sprocket.js**

```javascript
// Add sprocket request to a queue. These things take time.
var amino = require('amino');

amino.queue('orders', {type: 'sprocket-b', spokes: 5});
console.log('Your order is processing!');
```

**make-sprockets.js**

```javascript
// Fulfill sprocket requests.
var amino = require('amino');

amino.process('orders', function(order, next) {
  makeSprocket(order, function(err, sprocket) {
    if (sprocket) {
      console.log('Created sprocket with id ' + sprocket.id);
    }
    next(err);
  });
});
```

### request/respond

**serve-sprocket.js**

```javascript
// Create a sprocket service.
var amino = require('amino');

// "sprockets" will be our virtual host. We'll also tag it with
// a version (2.1.0) for requests to filter by.
amino.respond('sprockets@2.1.0', function(router, spec) {
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
var amino = require('amino');

// amino.request() is the same as github.com/mikeal/request, except
// it can handle the amino:// protocol, which uses virtual hosts defined
// with amino.respond().
amino.request('amino://sprockets/af920c').pipe(process.stdout);

// To limit the request to hosts running sprockets v2.x, we can use a special header:
amino.request({url: 'amino://sprockets/af920c', headers: {'x-amino-version': '2.x'}}).pipe(process.stdout);
```

### createService (Advanced)

**create-service.js**

```javascript
// Create a TCP service which sends "hello world"
var amino = require('amino')
  , net = require('net');

var server = net.createServer(function(socket) {
  socket.on('data', function(data) {
    socket.end('hello world');
  });
});
var service = amino.createService('hello@1.0.0', function(spec) {
  server.listen(spec.port);
});
```

**use-service.js**

```javascript
// Connect to the hello service
var amino = require('amino')
  , net = require('net')
  , req
  , socket
  ;

req = amino.requestService('hello', '1.x');
req.on('spec', function(spec) {
  socket = net.createConnection(spec.port);
  socket.setEncoding('utf8');
  socket.on('data', function(data) {
    // data is "hello world"
  });
  socket.on('error', function(err) {
    req.emit('error', err);
  });
});
```
