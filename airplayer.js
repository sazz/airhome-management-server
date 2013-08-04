var events = require('events'),
	iceStreamerModule = require('./icestreamer'),
	airtunes = require('airtunes'),
	util = require('util');

// monitor buffer events
airtunes.on('buffer', function(status) {
  console.log('buffer ' + status);

  // after the playback ends, give some time to AirTunes devices
  if(status === 'end') {
    console.log('playback ended, waiting for AirTunes devices');
    setTimeout(function() {
      airtunes.stopAll(function() {
        console.log('end');
        process.exit();
      });
    }, 2000);
  }
});	

var AirPlayer = function() {
	this.currentChannelUrl = '';
	this.currentChannelId = 0;
	this.iceStreamer = new iceStreamerModule.IceStreamer();
	var self = this;
	this.iceStreamer.on("trackInfo", function(data) {
		self.onTrackInfo(data);
	});
	this.iceStreamer.on("streamClosed", function(data) {
		self.onStreamClosed(data);
	});
	this.iceStreamer.on("streamReady", function(data) {
		self.onStreamReady(data);
	});
	this.deviceMap = {};
	this.artistInfo = '';
	this.trackInfo = 'AirHome';
};

module.exports.AirPlayer = AirPlayer;

util.inherits(AirPlayer, events.EventEmitter);

AirPlayer.prototype.setChannelUrl = function(channelId, channelUrl, stationName) {
	console.log('playing URL ' + channelUrl + ' and storing id ' + channelId);
	this.currentChannelId = channelId;
	this.currentChannelUrl = channelUrl;
	this.iceStreamer.playUrl(channelUrl, stationName);
};

AirPlayer.prototype.getChannelId = function() {
	return this.currentChannelId;
};

AirPlayer.prototype.getChannelUrl = function() {
	return this.currentChannelUrl;
};

AirPlayer.prototype.addDevice = function(deviceId, deviceIp) {
	console.log('adding device ' + deviceIp);
	if (this.deviceMap[deviceIp] != null) {
		return null;
	}
	var newDevice = airtunes.add(deviceIp, 5000);
	var self = this;
	newDevice.on('status', function(status) {
		console.log('status: ' + status);
		if(status == 'stopped') {
			self.deviceMap[deviceIp] = null;
			self.emit("deviceClosed", deviceId);
		}
	});
	this.deviceMap[deviceIp] = newDevice;
	airtunes.setTrackInfo(newDevice.key, this.trackInfo, this.artistInfo, '', function() {
	});
	return deviceIp;
};

AirPlayer.prototype.delDevice = function(deviceIp) {
	console.log('removing host ' + deviceIp);
	var device = this.deviceMap[deviceIp];
	if (device == null) {
		return false;
	}
	device.stop();
	this.deviceMap[deviceIp] = null;
	return true;
};

AirPlayer.prototype.setVolume = function(deviceIp, volume) {
	var device = this.deviceMap[deviceIp];
	if (device == null) {
		return false;
	}
	device.setVolume(volume, function() {
		console.log('setting volume on ' + deviceIp + ' to ' + volume);
	});
};

AirPlayer.prototype.onTrackInfo = function(data) {
	this.artistInfo = data.station;
	this.trackInfo = data.title;
	this.updateTrackInfo();
};

AirPlayer.prototype.onStreamReady = function(data) {
	console.log('received stream ready, playing stream now');
	var source = data.source;
	source.pipe(airtunes);
};

AirPlayer.prototype.onStreamClosed = function() {
	this.artistInfo = '';
	this.trackInfo = 'AirHome';
	this.updateTrackInfo();
};

AirPlayer.prototype.updateTrackInfo = function() {
	if (this.artistInfo == null) {
		this.artistInfo = '';
	}
	for (var key in this.deviceMap) {
		if (this.deviceMap.hasOwnProperty(key)) {
			var device = this.deviceMap[key];
			if (device != null) {
				airtunes.setTrackInfo(device.key, this.trackInfo, this.artistInfo, '');
				console.log('setting track info for ' + device.key);
			}
		}
	}
	console.log('updated track info with name ' + this.trackInfo);
};