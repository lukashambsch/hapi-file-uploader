$(document).ready(function () {
  $('#fine-uploader').fineUploader({
    request: {
      endpoint: '/uploads'
    }
  });
});
