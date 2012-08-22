var amino = require('../').init();

amino.subscribe('cool stuff', function (stuff) {
  console.log('stuff.cool = ' + stuff.cool);
});