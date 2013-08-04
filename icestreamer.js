var util = require('util'),
    events = require('events'),
    icecast = require('icecast'),
    lame = require('lame');
    

var IceStreamer = function() {
	this.stationName = null;
	this.client = null;
	this.response = null;
	this.decoder = null;
};

util.inherits(IceStreamer, events.EventEmitter);

module.exports.IceStreamer = IceStreamer;

IceStreamer.prototype.playUrl = function(iceUrl, stationName) {
	this.ensureClientStopped();
	this.stationName = stationName;
	var self = this;
	if (iceUrl !== '') {
		this.client = icecast.get(iceUrl, function(response) {
			self.onConnected(response);
		});
		console.log('having icecast client ' + this.client + '.');
	}
};

IceStreamer.prototype.ensureClientStopped = function() {
	if (this.client != null) {
		this.emit("streamClosed");
		if (this.response != null) {
			this.response.unpipe();
			this.response.connection.destroy();
			this.response = null;
		}
	    if (this.decoder != null) {
	    	this.decoder.unpipe();
	    	this.decoder = null;
	    }
	    this.client.abort();
	    this.client = null;
	    console.log("icecast stream ended.");
	} else {
	    console.log("icecast wasn't running.");
	}
};

IceStreamer.prototype.onConnected = function(streamResponse) {
	console.log('received response');
	console.log(streamResponse.headers);
	var self = this;
	streamResponse.on('metadata', function(metadata) {
		var parsed = icecast.parse(metadata);
		console.log('headers received');
		console.log(parsed);
		if (parsed.StreamTitle != null) {
			self.emit("trackInfo", {
				station: self.stationName,
				title: parsed.StreamTitle
			});
		}
	});
	streamResponse.pipe(new lame.Decoder()).on('format', function(format) {
		console.log('format is ' + format);
		self.decoder = this;
		console.log(self.stationName);
		self.emit("streamReady", {
			source: this
		});
		// this.pipe(airtunes);
	});
	this.response = streamResponse;
};
