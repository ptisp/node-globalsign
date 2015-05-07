var GlobalSign = require('../lib/globalsignapi');

var config = {
  dev: process.env.GSIGN_DEV || false,
  username: process.env.GSIGN_USER,
  password: process.env.GSIGN_PASSWORD,
};

var globalsignsexample = new GlobalSign(config);


globalsignsexample.on('ready', function() {
  globalsignsexample.getAccountInfo(function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });
});
