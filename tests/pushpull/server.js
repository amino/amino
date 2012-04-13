// Push letters of the alphabet to a queue.
var context = require('rabbit.js').createContext();
context.on('ready', function() {
  var pub = context.socket('PUSH');
  pub.connect('alphabet', function() {
    var ids = 'ABCDEFGHIJKLMNOPQRSTUVWYXZ';
    var id = 0;
    setInterval(function() {
      // Send the next letter in the set.
      if (id == ids.length) {
        id = 0;
      }
      var letter = ids[id++];
      var message = JSON.stringify({letter: letter});
      pub.write(message + "\n", 'utf8');
      console.log(message);
    }, 1000);
  });
});
