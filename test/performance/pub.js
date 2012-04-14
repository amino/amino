var amqp = require('amqp');

var conn = amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});
conn.on('ready', function(){

    for(var i = 0; i < 1000; i++){
        conn.publish('speed', new Date().getTime());
    }

    console.log('published ' + i + ' messages');
});
