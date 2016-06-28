var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};


var server = http.createServer(function (req, res) {
	var filePath = false;
	if (req.url == '/') {
		filePath = 'public/index.html';
	} else{
		filePath = 'public' + req.url;
	};

	var absPath = './' + filePath;
	serveStatic(res, cache, absPath);
});
server.listen(3000, function () {
	console.log('Server listening on port 3000');
});



function sendFile (response, filePath, fileContents) {
	response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}

function send404 (response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

function serveStatic (response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	} else{
		fs.exists(absPath, function  (exists) {
			if (exists) {
				fs.readFile(absPath, function (err, data) {
					if (err) {
						send404(response);
					} else{
						sendFile(response, absPath, data);
						cache[absPath] = data;						
					};
				});
			} else{
				send404(response);
			};
		})
	};
}