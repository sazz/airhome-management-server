var airPlayerModule = require('./airplayer.js');



var ZoneManager = function() {
	this.zoneMap = { zoneA: new airPlayerModule.AirPlayer() };
	this.deviceMap = {};
	var self = this;
	for (var key in this.zoneMap) {
		if (this.zoneMap.hasOwnProperty(key)) {
			var zone = this.zoneMap[key];
			zone.on("deviceClosed", function(deviceId) {
				self.deviceMap[deviceId] = null;
			});
		}
	}
};

module.exports.ZoneManager = ZoneManager;

/**
 * Returns the possible zones.
 */
ZoneManager.prototype.getZones = function() {
	return [ 'zoneA' ];
};

ZoneManager.prototype.addHost = function(zoneId, newDeviceId, ip) {
	var newZone = this.zoneMap[zoneId];
	if (newZone == null) {
		return null;
	}
	
	var device = this.deviceMap[ip];
	if (device != null) {
		if (device.zonePlayer === newZone) {
			// already in zone
			return device.id;
		}
		device.zonePlayer.delDevice(ip);
		this.deviceMap[ip] = null;
	}
	
	var newDevice = newZone.addDevice(newDeviceId, ip);
	var deviceData = {
			zoneDevice: newDevice,
			zonePlayer: newZone,
			zoneId: zoneId,
			deviceIp: ip,
			id: newDeviceId,
			volume: 0
	};
	this.deviceMap[newDeviceId] = deviceData;
	return deviceData.id;
};

ZoneManager.prototype.delHost = function(deviceId) {
	var device = this.deviceMap[deviceId];
	if (device == null) {
		return false;
	}
	device.zonePlayer.delDevice(device.deviceIp);
	this.deviceMap[deviceId] = null;
};

ZoneManager.prototype.setVolume = function(deviceId,volume) {
	var device = this.deviceMap[deviceId];
	if (device == null) {
		return false;
	}
	device.zonePlayer.setVolume(device.zoneDevice, volume);
	device.volume = volume;
	return true;
};

ZoneManager.prototype.getVolume = function(deviceId) {
	var device = this.deviceMap[deviceId];
	if (device == null) {
		return 0;
	}
	
	return device.volume;
};

ZoneManager.prototype.getZoneId = function(deviceId) {
	var device = this.deviceMap[deviceId];
	if (device == null) {
		return null;
	}
	
	return device.zoneId;
};

ZoneManager.prototype.getZoneChannelUrl = function(zoneId) {
	var zonePlayer = this.zoneMap[zoneId];
	if (zonePlayer == null) {
		return null;
	}
	
	return zonePlayer.getChannelUrl();
};

ZoneManager.prototype.setZoneChannelUrl = function(zoneId, channelId, channelUrl, stationName) {
	var zonePlayer = this.zoneMap[zoneId];
	if (zonePlayer == null) {
		return null;
	}
	zonePlayer.setChannelUrl(channelId, channelUrl, stationName);
};

ZoneManager.prototype.getZoneChannelId = function(zoneId) {
	var zonePlayer = this.zoneMap[zoneId];
	if (zonePlayer == null) {
		return null;
	}
	
	return zonePlayer.getChannelId();
};

