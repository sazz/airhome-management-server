
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  ,	mysql	= require('mysql')
  , connectionsArray	= []
  , connection	= mysql.createConnection({
      user : 'airhome',
      password : 'airhome',
      database : 'airhome',
      socketPath: '/var/run/mysqld/mysqld.sock'
  })
  , POLLING_INTERVAL = 3000
  , pollingTimer
  , zoneManagerModule = require('./zonemanager.js');

var app = express();
var deviceMap = {};
var speakerIpMap = {};
var channelMap = {};
var zoneManager = new zoneManagerModule.ZoneManager();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


//creating a new websocket to keep the content updated without any AJAX request
io.sockets.on( 'connection', function ( socket ) {

	console.log('Number of connections:' + connectionsArray.length);
	// starting the loop only if at least there is one user connected
	if (!connectionsArray.length) {
		pollingLoop();
	}

	socket.on('disconnect', function () {
		var socketIndex = connectionsArray.indexOf( socket );
		console.log('socket = ' + socketIndex + ' disconnected');
		if (socketIndex >= 0) {
			connectionsArray.splice( socketIndex, 1 );
		}
	});
	socket.on("speakerChange", function(data) {
		console.log("speaker " + data.id + " changed to " + data.selected + " and volume " + data.volume);
		if (data.selected) {
			zoneManager.addHost('zoneA', data.id, speakerIpMap[data.id]);
		} else {
			zoneManager.delHost(data.id);
		}
	});
	socket.on("volumeChange", function(data) {
		console.log("volume change for " + data.id + " with volume " + data.volume);
		zoneManager.setVolume(data.id, data.volume);
	});
	socket.on("channelChange", function(data) {
		console.log("channel " + data.id + " set.");
		var channelData = channelMap[data.id];
		zoneManager.setZoneChannelUrl('zoneA', data.id, channelData.url, channelData.title);
	});
	console.log( 'A new socket is connected!' );
	connectionsArray.push( socket );

});

var updateSockets = function ( data ) {
	// adding the time of the last update
	data.time = new Date();
	// sending new data to all the sockets connected
	connectionsArray.forEach(function( tmpSocket ){
		tmpSocket.volatile.emit( 'notification' , data );
	});
};

var pollingLoop = function () {
	// Doing the database query
	var channelQuery = connection.query('SELECT id, title, url FROM channels ORDER BY order_number ASC');
	var speakerQuery = connection.query('SELECT id, title, ip FROM speakers ORDER BY order_number ASC');
	var channels = [], speakers = []; // this array will contain the result of our db query
	var channelDone = false, speakerDone = false;
	// setting the query listeners

	channelQuery.on('error', socketError).on('result', function( channel ) {
		// it fills our array looping on each user row inside the db
		channelMap[channel.id] = {
				title: channel.title,
				url: channel.url
		};
		channel.selected = channel.id == zoneManager.getZoneChannelId('zoneA');
		channels.push( channel );
	}).on('end', function() {
		channelDone = true;
		if (speakerDone === true) {
			updateClientStatus(channels, speakers);
		}
	});
	speakerQuery.on('error', socketError).on('result', function( speaker ) {
		speakerIpMap[speaker.id] = speaker.ip;
		console.log('for id ' + speaker.id + ' volume ' + zoneManager.getVolume(speaker.id));
		speaker.volume = zoneManager.getVolume(speaker.id);
		if (zoneManager.getZoneId(speaker.id) == 'zoneA') {
			speaker.selected = true;
		} else {
			speaker.selected = undefined;
		}
		speakers.push( speaker );
	}).on('end', function() {
		speakerDone = true;
		if (channelDone === true) {
			updateClientStatus(channels, speakers);
		}
	});

};

function updateClientStatus(channels, speakers) {
	// loop on itself only if there are sockets still connected
	if(connectionsArray.length) {
		pollingTimer = setTimeout( pollingLoop, POLLING_INTERVAL );

		updateSockets({channels:channels, speakers:speakers});
	}
}
function socketError(err) {
	// Handle error, and 'end' event will be emitted after this as well
	console.log( err );
	updateSockets( err );
}	
