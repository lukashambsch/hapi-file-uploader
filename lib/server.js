var Hapi = require('hapi'),
    crypto = require('crypto'),
    aws = require('aws-sdk'),
    Good = require('good'),
    Path = require('path'),
    server = new Hapi.Server(),
    assetsPath = __dirname + '/../node_modules/fine-uploader/s3.jquery.fine-uploader/',
    clientSecretKey = process.env.CLIENT_SECRET_KEY,
    serverPublicKey = process.env.SERVER_PUBLIC_KEY,
    serverSecretKey = process.env.SERVER_SECRET_KEY,
    expectedBucket = 'wtc-test-upload',
    expectedMinSize = null,
    expectedMaxSize = null,
    s3;

server.connection({ port: 3000 });

server.views({
  engines: {
    html: require('handlebars'),
  },
  relativeTo: __dirname,
  path: './views',
  layoutPath: './helpers'
});

server.route({
  method: 'GET',
  path: '/assets/{name}',
  handler: function (request, reply) {
    name = encodeURIComponent(request.params.name);
    if (name.indexOf('js') > -1) {
      console.log(assetsPath + 's3.jquery.' + name);
      reply.file(assetsPath + 's3.jquery.' + name);
    } else {
      reply.file(assetsPath + name);
    }
  }
});

// Init S3, given your server-side keys.  Only needed if using the AWS SDK.
aws.config.update({
    accessKeyId: serverPublicKey,
    secretAccessKey: serverSecretKey
});
s3 = new aws.S3();


server.route({
  method: 'POST',
  path: '/s3handler',
  handler: onUpload
});

function onUpload(req, res) {
  signPolicy(req, res);
}

// Signs "simple" (non-chunked) upload requests.
function signPolicy(req, res) {
    var base64Policy = new Buffer(JSON.stringify(req.payload)).toString("base64"),
        signature = crypto.createHmac("sha1", clientSecretKey)
        .update(base64Policy)
        .digest("base64");

    var jsonResponse = {
        policy: base64Policy,
        signature: signature
    };

    if (isPolicyValid(req.payload)) {
        res(JSON.stringify(jsonResponse));
    }
    else {
        res.status = 400;
        res(JSON.stringify({invalid: true}));
    }
}

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

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    reply.view('index');
  }
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

server.start(function () {
  server.log('info', 'Server running at: ' + server.info.uri);
});
