$(document).ready(function () {
  $('#fineUploader').fineUploaderS3({
    request: {
      endpoint: "wtc-test-upload.s3.amazonaws.com",
      accessKey: "AKIAJMPJOEBE66L3NFIA",
    },
    signature: {
      endpoint: "/s3handler"
    }
  });
});
