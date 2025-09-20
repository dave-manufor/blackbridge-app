'use strict';

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Only run for this S3 origin (Terraform injects the ID here)
  const s3OriginId = "${s3_origin_id}";
  if (!request.origin || !request.origin.s3 || request.origin.s3.id !== s3OriginId) {
    return callback(null, request);
  }

  // If the request has a file extension (e.g. .js, .css, .png), leave it alone
  if (uri.match(/\.[a-zA-Z0-9]+$/)) {
    return callback(null, request);
  }

  // Otherwise rewrite to index.html
  console.log(`Rewriting request.uri -> /index.html`);
  request.uri = "/index.html";

  return callback(null, request);
};
