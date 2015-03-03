var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

var server = require('../server.js');

describe('upload/routes', {timeout: 10000}, function () {

  describe('GET /', function () {

    it('returns a 200 status code', function (done) {
      var options = {
        method: 'GET',
        url: '/'
      };

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        done();
      });

    });

  });

  describe('GET /assets/*', function () {

    it('css returns a 200 status code', function (done) {
      var options = {
        method: 'GET',
        url: '/assets/fine-uploader.css'
      };

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        done();
      });

    });

    it('js returns a 200 status code', function (done) {
      var options = {
        method: 'GET',
        url: '/assets/fine-uploader.js'
      };

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        done();
      });

    });

  });

  describe('GET /s3handler', function () {

    var options = {
      method: 'POST',
      url: '/s3handler',
      payload: {
        conditions: [
          {'acl': 'private'},
          {'bucket': 'wtc-test-upload'},
          {'Content-Type': 'image/png'},
          {'success_action_status': '200'},
          {'key': '151ba0e9-4c97-4453-ac40-b8c25cdf197e.png'},
          {'x-amz-meta-qqfilename': 'NanniesCA%20logo.png'}
        ],
        expiration: '2015-02-28T21:57:10.107Z'
      }
    };

    it('returns a 200 status code', function (done) {

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        done();
      });

    });

    it('returns a policy', function (done) {

      server.inject(options, function (response) {
        var payload = JSON.parse(response.payload);
        expect(typeof(payload.policy)).to.equal('string');
        done();
      });

    });

  });

});
