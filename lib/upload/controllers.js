var aws = require('aws-sdk');
var crypto = require('crypto');

var assetsPath = __dirname + '/../../node_modules/fine-uploader/s3.jquery.fine-uploader/';
var clientSecretKey = process.env.CLIENT_SECRET_KEY;
var serverPublicKey = process.env.SERVER_PUBLIC_KEY;
var serverSecretKey = process.env.SERVER_SECRET_KEY;
var expectedBucket = 'wtc-test-upload';
var expectedMinSize = null;
var expectedMaxSize = null;

// Init S3, given your server-side keys.  Only needed if using the AWS SDK.
aws.config.update({
    accessKeyId: serverPublicKey,
    secretAccessKey: serverSecretKey
});
var s3 = new aws.S3();

module.exports = {
  home: function (request, reply) {
    reply.view('index');
  },

  loadStatic: function (request, reply) {
    var name = encodeURIComponent(request.params.name);
    if (name.indexOf('js') > -1) {
      reply.file(assetsPath + 's3.jquery.' + name);
    } else {
      reply.file(assetsPath + name);
    }
  },

  // Signs "simple" (non-chunked) upload requests.
  onUpload: function (request, reply) {
    var base64Policy = new Buffer(JSON.stringify(request.payload)).toString("base64"),
        signature = crypto.createHmac("sha1", clientSecretKey)
        .update(base64Policy)
        .digest("base64");

    var jsonResponse = {
      policy: base64Policy,
      signature: signature
    };

    if (isPolicyValid(request.payload)) {
      reply(JSON.stringify(jsonResponse));
    }
    else {
      reply.status = 400;
      reply(JSON.stringify({invalid: true}));
    }
  }

};

// Ensures the policy document associated with a "simple" (non-chunked) request is
// targeting the correct bucket and the min/max-size is as expected.
// Comment out the expectedMaxSize and expectedMinSize variables near
// the top of this file to disable size validation on the policy document.
function isPolicyValid(policy) {
    var bucket, parsedMaxSize, parsedMinSize, isValid;

    policy.conditions.forEach(function(condition) {
        if (condition.bucket) {
            bucket = condition.bucket;
        }
        else if (condition instanceof Array && condition[0] === "content-length-range") {
            parsedMinSize = condition[1];
            parsedMaxSize = condition[2];
        }
    });

    isValid = bucket === expectedBucket;

    // If expectedMinSize and expectedMax size are not null (see above), then
    // ensure that the client and server have agreed upon the exact same
    // values.
    if (expectedMinSize != null && expectedMaxSize != null) {
        isValid = isValid && (parsedMinSize === expectedMinSize.toString())
                          && (parsedMaxSize === expectedMaxSize.toString());
    }

    return isValid;
}
