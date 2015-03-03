var hapi = require('hapi');
var bunyan = require('bunyan');

var routes = require('./lib/routes/routes.js');

var server = new hapi.Server();

server.connection({ port: 3000 });

server.views({
  engines: {
    html: require('handlebars'),
  },
  relativeTo: __dirname,
  path: './lib/views'
});

server.register({
  register: require('hapi-bunyan'),
  options: {
    logger: bunyan.createLogger({ name: 'test', level: 'debug' }),
  },
}, function (err) {
    if (err) {
      throw err;
    }
});

server.route(routes());

module.exports = server;

server.start(function () {
  server.log('info', 'Server running at: ' + server.info.uri);
});
