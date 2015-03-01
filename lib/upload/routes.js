var controllers = require('./controllers.js');

module.exports = function () {
  return [
    {
      method: 'GET',
      path: '/',
      handler: controllers.home
    },
    {
      method: 'GET',
      path: '/assets/{name}',
      handler: controllers.loadStatic
    },
    {
      method: 'POST',
      path: '/s3handler',
      handler: controllers.onUpload
    }
  ]
};
