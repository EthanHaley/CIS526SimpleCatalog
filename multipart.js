/**
* @module
* A module for processing multipart HTTP requests
*/
module.exports = multipart;

const CRLF = Buffer.from([0x0D, 0x0A]);
const DOUBLE_CRLF = Buffer.from([0x0D,0x0A,0x0D,0x0A]);

/**
* @function multipart
* Takes a request and response object,
* parses the body of the multipart request
* and attaches its contents to the request
* object. If an error occurs, we log it
* and send a 500 status code. Otherwise
* we invoke next with the request and response.
*/
function multipart(req, res, next) {
  var chunks = [];

  req.on('error', function(err) {
    console.error(err);
    res.statusCode = 500;
    res.statusMessage = "Server Error";
    res.end();
  });

  req.on('data', function(chunk) {
    chunks.push(chunk);
  });

  req.on('end', function() {
    var body = Buffer.concat(chunks);
    var match = /boundary=(.+);?/.exec(req.headers['Content-Type']);

    if(match && match[1]) {
      processBody(body, match[1], function(err, contents) {
        if(err) {
        console.log(err);
        res.statusCode = 500;
        res.statusMessage = "Server Error";
        res.end();
        }

        req.body = contents;
        next(req, res);
      });
    }
    else {
      console.error("No multipart boundary defined.");
      req.statusCode = 400;
      req.statusMessage = "Malformed multipart request";
      res.end();
    }
  });
}

/**
* @function processBody
* Takes a buffer and a boundary and
* returns an associative array of
* key/value pairs; if content is a
* file, value will bean object with
* properties filename, contentType, and data
*/
function processBody(buffer, boundary, callback) {
  var formData = {};
  splitContentParts(buffer, boundary).forEach(function(content) {
    parseContent(content, function(err, parts) {
      if(err) return callback(err);
      formData[parts[0]] = parts[1];
    });
  });
  callback(false, formData);
}

function splitContentParts(buffer, boundary) {
  var parts = [];
  var start = buffer.indexOf('--' + boundary) + boundary.length + 2;
  var end = buffer.indexOf(boundary, start);
  while(end > start) {
    parts.push(buffer.slice(start, end));
    start = end + boundary.length;
    end = buffer.indexOf(boundary, start);
  }
  return parts;
}

/**
* @function parseContent
* Parses a content section and returns
* the key/value pair as a two-element array
*/
function parseContent(buffer, callback) {
  var index = buffer.indexOf(DOUBLE_CRLF);
  var head = buffer.slice(0, index).toString();
  var body = buffer.slice(index + 4, buffer.length - 4);

  var headers = {};
  head.split(CRLF).forEach(function(line){
    var parts = line.split(': ');
    var key = parts[0].toLowerCase();
    var value = parts[1];
    headers[key] = value;
  });

  var name = /name="([^;"]+)"/.exec(headers['content-disposition']);
  if(!name) return callback("No name in multipart content header");

  var filename = /filename="([^;"]+)"/.exec(headers['content-disposition']);
  if(filename) {
    var contentType = headers['content-type'];
    if(!contentType) contentType = 'application/octet-stream';
    callback(false, [name[1], {filename: filename[1], contentType: contentType, data: body}]);
  }
  else {
    callback(false, [name[1], body.toString()]);
  }
}