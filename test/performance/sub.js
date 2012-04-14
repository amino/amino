var amqp = require('amqp');

var conn = amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});

conn.on('ready', function(){
    var timers = [], chunk = 1000;
    conn.queue('speed', function(queue){
        queue.subscribe(function (message, headers, deliveryInfo) {
            timers.push(new Date().getTime() - message);
            if (timers.length === chunk) {
                console.log(timers);
                timers = [];
            }
        });
    });
});
