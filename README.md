Amino
=====

Clustering framework for Node.js

[![build status](https://secure.travis-ci.org/amino/amino.png)](http://travis-ci.org/amino/amino)

Idea
----

Amino is a toolkit for building clusterable, fault-taulerant apps in Node.js.

Features:

- Two robust communications patterns bundled: **publish/subscribe** and
  **service/request**
- Decentralized service registry
- Supports [semver](http://semver.org) specifications
- Automated host/port assignments and gossiping
- Built-in load-balancing, sticky sessions, consistent hashing, and failover
- Enables your app to have no single point of failure
- Much, much faster and cooler than [hook.io](https://github.com/hookio/) ;)
- Simple, extensible architecture

Installation
------------

In the root of your project,

```bash
$ npm install --save amino
```

To use the default configuration (requires [redis](http://redis.io) listening
at `localhost:6379`), simply call:

```javascript
var amino = require('amino').init();
```

Pattern #1: publish/subscribe
-----------------------------

### Method: `amino.publish(ev [, arg, arg...])`

Publishes an event across the cluster, with an optional payload.

- `ev`: Event name, can be any string.
- `arg`: Argument(s) to pass to subscriber handlers. Note that since data must be
  serialized, custom javascript class instances will not survive intact. Native
  objects will attempt to be unserialized via
  [hydration](https://github.com/carlos8f/hydration).

#### Example

```javascript
amino.publish('cool stuff', {cool: true});
```

### Method: `amino.subscribe(ev, handler)`

Subscribes to an event.

- `ev`: Event name as passed to `amino.publish()`
- `handler`: An event handler, which will be passed any arguments that were
  part of the `publish()` call.

#### Example

```javascript
amino.subscribe('cool stuff', function (stuff) {
  // stuff.cool == true
});
```

### Method: `amino.unsubscribe(ev [, handler])`

Unsubscribes from an event.

- `ev`: Event name as passed to `amino.subscribe()`
- `handler`: The event handler used with `amino.subscribe()`. If not specified,
  unsubscribes all handlers of the event.

#### Example

```javascript
amino.unsubscribe('cool stuff', coolStuffHandler);
```

Pattern #2: service/request
---------------------------

### Method: `amino.createService(service-name[@version] | spec, server)`

Registers an Amino service.

- `service-name`: The name of your service (should be alpha-numeric/dashes)
  with an optional [semver](http://semver.org) specification.
- `spec`: Alternatively, you may specify the full spec of your service, if
  you already have a port (you will then have to call `listen()` yourself):

  ```javascript
  var spec = {
    service: "service-name@0.1.0",
    host: "server-a",
    port: 5678
  };
  var service = amino.createService(spec, server);
  server.listen(spec.port);
  ```
- `server`: A server instance returned by `net.createServer()` or
  `http.createServer()`.

Returns: a `Service` instance.

- (event) `listening`: called when the service has published itself and is
  available for requests.
- (property) `spec`: an object containing info about the service (gossiped
  around the cluster)
    - `service`: the service name
    - `version`: the service version, if specified
    - `host`: the hostname the server is reachable from
    - `port`: the server's listening port
    - `id`: a unique string identifying the server
- (method) `close(onClose)`: close the service and the associated server. Called
  automatically when the server closes.
- (event) `close`: called when the service closes.

#### Example

To create a service, first create a `net` or `http` server:

```javascript
var server = require('http').createServer(function (req, res) {
  res.end('cool stuff');
});
```

Then pass the server to `amino.createService()`, which will `listen()` on an
emphemeral port and broadcast the availability of your service.

```javascript
var service = amino.createService('cool-stuff@0.1.0', server);
```

### Method: `amino.request(service-name[@version], pathSpec [, options, onResponse])`

Makes round-robin requests to Amino `http` services.

- Alternate syntax:
    - (simple GET): `amino.request('amino://service-name/' [, onResponse])`
    - (generic HTTP): `amino.request('http://some-site/' [, onResponse])`
    - (url in options): `amino.request(options, [, onResponse])`
- `service-name`: the name of the service to request, with an optional
  [semver](http://semver.org) specification. Can be specified as the first
  parameter to `amino.request()`, or as the hostname in an amino url such as
  `amino://service-name/`.
- `pathSpec`: the path to request, with an optional method before it, such as
  `POST /posts` or `DELETE /everything`.
- `options`: options object to pass to the request, containing keys such as
  `headers` and `body` (for posts, etc.). See
  [mikeal/request](https://github.com/mikeal/request) for more options.
- `onResponse`: callback to be called with the arguments `err, res, body` when
  a response is received.

Returns: an `http.ClientRequest` object.

#### Example

```javascript
var req = amino.request('cool-stuff@0.1.x', '/', function (err, res, body) {
  // body == 'cool stuff'
});
```

#### "Sticky" sessions

Amino has support for [consistent hashing](http://en.wikipedia.org/wiki/Consistent_hashing)
which can be used to route multiple requests to the same server.

To enable this feature, pass a special header called `X-Amino-StickyId`
to requests, containing an IP address, cookie value, or other identifier to
consistently route requests with.

Note that as servers are added or removed from the service, sticky routing
can be subject to change.

### Method: `amino.requestService(service-name[@version], onSpec)`

Requests a round-robined server for the specified service. Use this for `net`
services, or to manually get a server spec for a given service.

- `service-name`: the name of the service to request, with an optional
  [semver](http://semver.org) specification.
- `onSpec`: callback to be called with a server `spec` object containing:
    - `service`: the service name
    - `version`: the service version, if specified
    - `host`: the hostname the server is reachable from
    - `port`: the server's listening port
    - `id`: a unique string identifying the server

Returns: a `ServiceRequest` instance:

- (event) `spec`: called with the `spec` object.
- (property) `headers`: an array of headers for the request (used internally)

#### Example

```javascript
amino.requestService('cool-stuff@0.1.x', function (spec) {
  // now we can connect to spec.host/spec.port
});
```

Configuration
-------------

Amino is bundled with three plugins by default:
[amino-redis](https://github.com/amino/amino-redis),
[amino-service](https://github.com/amino/amino-service), and
[amino-request](https://github.com/amino/amino-request).

Core plugins can be configured by passing options to `init()`.

```javascript
var amino = require('amino')
  .init({
    redis: redis options...
    service: service options...
    request: request options...
  });
```

To disable a plugin, just pass `false`.

### Redis options

- To specify a single redis server, just pass a `host`, `port`, or `host:port` to
  `init`, for example:

  ```javascript
  var amino = require('amino')
    .init({
      redis: "1.2.3.4:5679"
    });
  ```
- To use multiple redis servers for failover/load-balancing, just pass an array
  of servers. See [haredis](https://github.com/carlos8f/haredis) for more
  information.
- To pass options to the redis client:

  ```javascript
  var amino = require('amino')
    .init({
      redis: {
        nodes: "1.2.3.4:5679",
        node_redis/haredis options here...
      }
    });
  ```

### Service options

- `host`: By default, Amino will auto-detect your server's network IP by
  performing a DNS lookup on the server's `hostname`. If you already know the
  correct IP (or hostname) to use, you can specify it with this option.

### Request options

- `specRequestThrottle`: interval (in ms) to throttle publishes when requesting
  specs for a service. (Default: `5000`)
- `specRequestInterval`: interval (in ms) to request "straggler" specs for all
  services. (Default: `120000`)
- `readyTimeout`: time (in ms) before a service is deemed "ready" after getting
  the first spec. (Default: `200`)
- (other options will also be passed to `http.Agent` constructor)

Extending Amino
---------------

To extend Amino, simply create a module which exports an `attach` function, which
will be called in Amino's scope:

```javascript
exports.attach = function (options) {
  var amino = this;
  // extend amino!
});
```

To load the plugin, call `amino.use()`:

```javascript
var amino = require('amino')
  .use(require('my-plugin'), {options...})
  .init();
```

---

Developed by [Terra Eclipse](http://www.terraeclipse.com)
---------------------------------------------------------

Terra Eclipse, Inc. is a nationally recognized political technology and
strategy firm located in Aptos, CA and Washington, D.C.

[http://www.terraeclipse.com](http://www.terraeclipse.com)


License: MIT
------------

- Copyright (C) 2012 Carlos Rodriguez (http://s8f.org/)
- Copyright (C) 2012 Terra Eclipse, Inc. (http://www.terraeclipse.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.