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
      reply.file(assetsPath + 's3.jquery.' + name);
    } else {
      reply.file(assetsPath + name);
    }
  }
});

aws.config.update({
    accessKeyId: serverPublicKey,
    secretAccessKey: serverSecretKey
});
s3 = new aws.S3();

server.route({
  method: 'POST',
  path: '/s3handler',
  handler: function (req, res) {
    if (req.query.success !== undefined) {
      verifyFileInS3(req, res);
    }
    else {
      signRequest(req, res);
    }
  }
});

server.route({
  method: 'POST',
  path: '/s3handler/{uuid}',
  handler: function (req, res) {
    deleteFile(req.query.bucket, req.query.key, function (err) {
      if (err) {
        console.log('Problem deleting file: ' + err);
        res.status(500);
      }
      res.end();
    });
  }
});

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    reply.view('index');
  }
});


server.route({
  method: 'GET',
  path: '/uploader.js',
  handler: function (request, reply) {
    reply.file('./helpers/uploader.js');
  }
});

server.route({
  method: 'GET',
  path: '/test',
  handler: function (request, reply) {
    reply('Hello!');
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
  server.log('info', 'Client Key: ' + clientSecretKey);
  server.log('info', 'Server Public: ' + serverPublicKey);
  server.log('info', 'Server Private: ' + serverSecretKey);
});

function signRequest(req, res) {
    if (req.payload) {
        signRestRequest(req, res);
    }
    else {
        signPolicy(req, res);
    }
}

// Signs multipart (chunked) requests.  Omit if you don't want to support chunking.
function signRestRequest(req, res) {
    console.log(req);
    console.log(req.raw.req);
    var stringToSign = JSON.stringify(req.payload),
        signature = crypto.createHmac("sha1", clientSecretKey)
        .update(stringToSign)
        .digest("base64");

    var jsonResponse = {
        signature: signature
    };

    var res = res().header("Content-Type", "application/json").hold();

    console.log('141:', stringToSign);
    if (isValidRestRequest(stringToSign)) {
        console.log('142:', jsonResponse);
        res.send(JSON.stringify(jsonResponse));
    }
    else {
        res.status = 400;
        res.send(JSON.stringify({invalid: true}));
    }
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

    var res = res().header("Content-Type", "application/json").hold();

    if (isPolicyValid(req.payload)) {
        console.log('166:', jsonResponse);
        res.send(JSON.stringify(jsonResponse));
    }
    else {
        res.status = 400;
        res.send(JSON.stringify({invalid: true}));
    }
}

// Ensures the REST request is targeting the correct bucket.
// Omit if you don't want to support chunking.
function isValidRestRequest(headerStr) {
    return new RegExp("\/" + expectedBucket + "\/.+$").exec(headerStr) != null;
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
    //if (expectedMinSize != null && expectedMaxSize != null) {
        //isValid = isValid && (parsedMinSize === expectedMinSize.toString())
                          //&& (parsedMaxSize === expectedMaxSize.toString());
    //}

    return isValid;
}

// After the file is in S3, make sure it isn't too big.
// Omit if you don't have a max file size, or add more logic as required.
function verifyFileInS3(req, res) {
    function headReceived(err, data) {
        if (err) {
            res.status(500);
            console.log(err);
            res.end(JSON.stringify({error: "Problem querying S3!"}));
        }
        else if (data.ContentLength > expectedMaxSize) {
            res.status(400);
            res.write(JSON.stringify({error: "Too big!"}));
            deleteFile(req.payload.bucket, req.payload.key, function(err) {
                if (err) {
                    console.log("Couldn't delete invalid file!");
                }

                res.end();
            });
        }
        else {
            res.end();
        }
    }

    callS3("head", {
        bucket: req.payload.bucket,
        key: req.payload.key
    }, headReceived);
}

function deleteFile(bucket, key, callback) {
    callS3("delete", {
        bucket: bucket,
        key: key
    }, callback);
}

function callS3(type, spec, callback) {
    s3[type + "Object"]({
        Bucket: spec.bucket,
        Key: spec.key
    }, callback)
}
