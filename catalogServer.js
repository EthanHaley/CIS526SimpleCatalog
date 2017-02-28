"use strict";

var multipart = require('./multipart');
var template = require('./template');
var http = require('http');
var url = require('url');
var fs = require('fs');
var port = 12037;
var stylesheet = fs.readFileSync('public/catalog.css');

template.loadDir("templates");

var catalogServer = http.createServer(handleRequest);
catalogServer.listen(port, function() {
	console.log("Simple Catalog running on port " + port);
});

function handleRequest(req, res) {
	var urlParts = url.parse(req.url);

	switch(urlParts.pathname) {
		//Catalog index page
		case '':
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
				uploadEntry(req, res, serveCatalog);
			}
			break;
		case '/catalog.css':
     		res.setHeader('Content-Type', 'text/css');
     		res.end(stylesheet);
     		break;
		default:
			if(urlParts.pathname.includes('.jpg') || urlParts.pathname.includes('.png')) {
				serveImage(req.url, req, res);
			}
			else {
				serveEntry(urlParts.pathname, req, res);
			}
			break;
	}
}

function serveEntry(urlPath, req, res) {
	var path = urlPath.substr(1, urlPath.length) + '.json';
	fs.readFile(path, function(err, data) {
		if(err) {
			console.error(err);
			res.statusCode = 404;
			res.statusMessage = "Resource not Found";
			res.end()
			return;
		}
		var entry = JSON.parse(data);
		res.end(buildEntry(entry));
	});
}

function buildEntry(entry)
{
	return template.render('catalogEntry.html', {
		image: imageNamesToTags([entry.image]).join(''),
		name: entry.name,
		description: entry.description 
	});
}

function buildCatalog(imageTags) {
	return template.render('catalog.html', {
		imageTags: imageNamesToTags(imageTags).join('')
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
		res.setHeader('Content-Type', 'text/html');
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
		var anchor = fileName.replace(/\.[^/.]+$/,"");
		return `<a href="${anchor}"><img src="${fileName}" alt="${fileName}"></a>`;
	});
}


function serveImage(fileName, req, res) {
	fs.readFile('images' + decodeURIComponent(fileName), function(err, data) {
		if(err) {
			console.error(err);
			res.statusCode = 404;
			res.statusMessage = "Resource not Found";
			res.end()
			return;
		}
		res.setHeader('Content-Type', 'image/*');
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

function uploadEntry(req, res) {
	multipart(req, res, function(req, res) {
		if(!req.body.image.filename || !req.body.entryName || !req.body.entryDescription) {
			console.error("Information Missing");
			res.statusCode = 400;
			res.statusMessage = "Information Missing";
			res.end("Information Missing");
			return;
		}
		var data = {entryName: req.body.entryName, entryDescription: req.body.entryDescription, entryImage: req.body.entryImage}
		fs.writeFile('entries/' + entryName + '.json', data, function(err) {
			console.error(err)
			res.statusCode = 500;
			res.statusMessage = "Server Error";
			res.end("Server Error");
			return;
		});
		fs.writeFile('images/' + entryName, req.body.image.data, function(err) {
			if(err) {
				console.error(err)
				res.statusCode = 500;
				res.statusMessage = "Server Error";
				res.end("Server Error");
				return;
			}
			serveCatalog(req, res);
		});
	});
}

function uploadForm(req, res) {
	res.end(template.render('catalogEntryUpload.html'));
}