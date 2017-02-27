"use strict";

var http = require('htpp');
var url = require('url');
var fs = require('fs');
var port = 12037;

var catalogServer = http.createServer(handleRequest);
catalogServer.listen(port, function() {
	console.log("Simple Catalog running on port " + port);
});

function handleRequest(req, res) {
	var urlParts = url.parse(req.url);

	switch(urlParts.pathname) {
		//Catalog index page
		case '/':
			serveCatalog(req, res);
			break;
		//Upload page
		case '/upload':
		case '/upload/':
			if(req.method == 'GET') {
				uploadForm(req, res);
			}
			else if(req.method == 'POST') {
				uploadItem(req, res);
			}
			break;
		//Favicon
		case 'favicon.ico':
			req.writeHead(400);
			req.end();
			break;
		//CSS
		case '/catalog.css':
			serveCSS(req, res);
			break;
		//Catalog entry page
		case '':
			break;
		default:
			serveImage(req, res);
			break;
	}
}


