const config = require('./config');

let request = require('request');
let cheerio = require('cheerio');
let MongoClient = require('mongodb').MongoClient;
let http = require('http');
let winston = require('winston');
let fs = require('fs');

let scrapeTimeout;
let db;

let error = false;

function formatTS(ts) {
	return (ts.getMonth() + 1) + '/' + ts.getDate() + '/' + ts.getFullYear() + ' ' + ts.getHours() + ':' + ts.getMinutes() + ':' + ts.getSeconds() + ':' + ts.getMilliseconds();
}

winston.configure({
	transports: [
		new(winston.transports.File)({
			filename: config.logFile
		})
	]
});


MongoClient.connect(config.mongoUrl, function(err, database) {
	if (err) {
		error = true;
		return winston.log('info', 'error connecting to mongo');
	}
	db = database;
	winston.log('info', 'Connected successfully to mongo server');

	scrapeTimeout = setInterval(scrapeTop, config.scrapeFrequencyMins * 60 * 1000);
	scrapeTop();
});

function insertDocuments(docs, callback) {
	var collection = db.collection(config.mongoCollection);
	collection.insertMany(docs, function(err, result) {
		if (err) {
			error = true;
			return winston.log('info', 'error inserting documents into mongo');
		}
		callback(result);
	});
}

function removeNewline(str) {
	return str.replace(/(\r\n|\n|\r)/gm, '').trim();
}

function scrapeTop() {
	request('https://esports.faeria.com/pandora-season', function(err, response, html) {
		if (err) {
			error = true;
			return winston.log('info', 'error making request');
		}
		if (response.statusCode !== 200) {
			error = true;
			return winston.log('info', 'invalid status code response from faeria server ' + response.statusCode);
		}
		if (!err && response.statusCode === 200) {
			let timestamp = Date.now();
			let $ = cheerio.load(html);

			var dataPoints = [];
			$('.players-table__row').each((i, row) => {
				let name = removeNewline($(row).children('.players-table__nickname').text());
				let points = removeNewline($(row).children('.players-table__pandora-pts').text());
				let level = removeNewline($(row).children('.players-table__level').text());
				if (name) {
					let dataPoint = {
						points: points,
						name: name,
						level: level,
						ts: timestamp
					}
					dataPoints.push(dataPoint);
				}
			});
			insertDocuments(dataPoints, (result) => {
				winston.log('info', 'inserted ' + result.ops.length + ' results at');
			});
		}
	});
}

/* Status server */
function handleRequest(req, res) {
	winston.query({
		from: new Date() - 48 * 60 * 60 * 1000,
		until: new Date(),
		limit: 100000,
		start: 0,
		order: 'desc',
	}, function(err, results) {
		if (err) {
			throw err;
		}

		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.end(JSON.stringify({
			error: error,
			log: results
		}));
	});
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(config.statusPort, function() {
	winston.log('info', 'Status server listening on port ' + config.statusPort);
});