var controllers = require('../controllers/controllers.js');

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
      method: 'GET',
      path: '/uploader.js',
      handler: controllers.loadHelper
    },
    {
      method: 'POST',
      path: '/s3handler',
      handler: controllers.onUpload
    }
  ]
};
