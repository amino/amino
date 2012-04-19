Base class for Cantina services. Gives access to the methods:

- **publish**('event-name', data)
  
  Publish an event.

- **subscribe**('event-name', function(data) {})

  Subscribe to an event.

- **push**('queue-name', data)

  Push some data onto a queue (FIFO).

- **pull**('queue-name', function(data) {})

  Pull some data off a queue (FIFO).

- **request**('svc://service-name/some/path?query=blah', function(err, res) {})

  Issue a request to a service, and handle the response.

- **reply**('service-name', ['/some/path'], function(req, res) {})

  Handle a service request.
