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
				uploadEntry(req, res);
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

function buildCatalog(imageTage) {
	return template.render('catalog', {
		title: config.title,
		imageTags: imageNamesToTags(imageTags),join('')
	});
}

function serveCatalog(req, res) {
	getImageNames(function(err, imageNames) {
		if(err) {
			console.error(err);
			res.statusCode = 500;
			res.statusMessage = "Server Error";
			res.end();
			return;
		}
		res.setHeader('COntent-Type', 'text/html');
		res.end(buildCatalog(imageNames));
	});
}

function getImageNames(callback) {
	fs.readdir('images/', function(err, fileNames) {
		if(err) callback(err, undefined);
		else callback(false, fileNames);
	});
}

function imageNamesToTags(fileNames) {
	return fileNames.map(function(fileName) {
		return '<img src="${fileName}" alt="${fileName}">';
	});
}

function serveImage(fileName, req, res) {
	fs.readFile('images/' + decodeURIComponent(fileName), function(err, data) {
		if(err) {
			console.error(err);
			res.statusCode = 500;
			res.statusMessage = "Resource not Found";
			res.end()
			return;
		}
		res.setHeader("Content-Type", "image/jpeg");
		res.end(data);
	});
}

function uploadImage(req, res) {
	multipart(req, res, function(req, res) {
		if(!req.body.image.filename) {
			console.error("No file in upload");
			res.statusCode = 400;
			res.statusMessage = "No file specified";
			res.end("No file specified");
			return;
		}
		fs.writeFile('images/' + req.body.image.filename, req.body.image.data, function(err) {
			if(err) {
				console.error(err);
				res.statusCode = 500;
				res.statusMessage = "Server Error";
				res.end("Server Error");
				return;
			}
			serveCatalog(req, res);
		});
	});
}