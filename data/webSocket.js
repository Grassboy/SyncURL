var gWebSocket = WebSocket || MozWebSocket;
var consoleLog = function(msg) {
	var debug = false;
	if (debug) {
		console.log(msg);
	}
}
//斷線重連機制
var retrytimer = null;
var reconnect = function() {
	consoleLog("Reconnect Server");
	self.postMessage("gsURL.page.reconnect");
	retrytimer = setTimeout(reconnect, 10000);
}
//定期檢查連線狀態
var pingtimer = null;
var pingserver = function() {
	consoleLog("send a ping");
	webSocket.send("ping");
	pingtimer = setTimeout(function() {
		consoleLog("Server no response...");
		webSocket.close(); //非 addon close 會觸發斷線重連的機制
	},
	10000);
};
//建立連線機制
var CreateWebSocket = function(host, key) {
	var webSocket = new gWebSocket(host + "/" + key, "gSyncURL");
	webSocket.onopen = function() {
		consoleLog("Reconnect Done...");
		clearTimeout(retrytimer);
		setTimeout(pingserver, 60000);
		retrytimer = null;
		self.postMessage("gsURL.page.connected", "*");
	};
	webSocket.onerror = function() {
		self.postMessage("gsURL.page.connectfailed", "*");
	};
	webSocket.onmessage = function(e) {
		var msg = e.data;
		if (e.data == "pong") {
			consoleLog("got a pong!!");
			clearTimeout(pingtimer);
			setTimeout(pingserver, 60000);
		} else {
			self.postMessage(msg, "*");
		}
	};
	webSocket.onclose = function() {
		if (webSocket.closeByAddon) {
			self.postMessage("gsURL.page.closed", "*");
		} else {
			self.postMessage("gsURL.page.closedByServer", "*");
			if (retrytimer == null) reconnect();
		}
	}
	return webSocket;
};
var webSocket = null;
self.port.on('message', function(data) {
	var prefix = "gsURL.addon.";
	var separate = "###_dre_###";
	consoleLog("Got!!!" + data);
	if (data.indexOf(prefix) != 0) {
		return;
	} else {
		var args = data.split("::");
		switch (args[0]) {
		case(prefix + "connect") : args = args[1].split(separate);
			try {
				webSocket = CreateWebSocket(args[0], args[1]);
			} catch(e) {
				self.postMessage("gsURL.page.connectfailed", "*");
			}
			break;
		case (prefix + "close") : if (webSocket) {
				webSocket.closeByAddon = true;
				webSocket.close();
			}
			break;
		}
	}
});
self.postMessage("gsURL.page.initialized", "*");
