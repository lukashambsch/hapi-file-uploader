var Hapi = require('hapi');
var Good = require('good');

var routes = require('./lib/upload/routes.js');

var server = new Hapi.Server();

server.connection({ port: 3000 });

server.views({
  engines: {
    html: require('handlebars'),
  },
  relativeTo: __dirname,
  path: './lib/views'
});

server.register({
  register: Good,
  options: {
    reporters: [{
      reporter: require('good-console'),
      args:[{ log: '*', response: '*' }]
    }]
  }
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
