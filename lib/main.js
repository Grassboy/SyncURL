var { Cc, Ci } = require("chrome");
var data = require("self").data;
var widgets = require("widget");
var windows = require("windows").browserWindows;
var tabs = require("tabs");

var consoleLog = function(msg) {
	var debug = false;
	if (debug) {
		console.log(msg);
	}
}
var prefManager = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
var isEnabled;
try {
	isEnabled = prefManager.getBoolPref("extensions.gSyncURL.enabled");
} catch(e) {
	prefManager.setBoolPref("extensions.gSyncURL.enabled", false);
	isEnabled = false;
}
var getConfig = function() {
	var args, r;
	try {
		args = prefManager.getCharPref("extensions.gSyncURL.urlkey");
		args = args.split("/key-");
	} catch(e) {
		consoleLog("ERROR!!!" + e);
		args = "ws://grassboy.tw:5400/key-urlsync-newbie";
		prefManager.setCharPref("extensions.gSyncURL.urlkey", args);
		args = args.split("/key-");
	}
	return args;
};
var config = getConfig();
var updateState = function(enabled, widget) {
	isEnabled = enabled;
	prefManager.setBoolPref("extensions.gSyncURL.enabled", enabled);

	if (isEnabled) {
		config = getConfig();
		widget.contentURL = data.url("syncing.png");
		page.port.emit("message", ["gsURL.addon.connect::", config[0], "###_dre_###", config[1]].join(''));
	} else {
		if (widget.contentURL == data.url("syncon.png")) {
			page.port.emit("message", ["gsURL.addon.close::"].join(''));
		}
	}
}

var widget = widgets.Widget({
	id: "syncurl",
	label: "SyncURL: Receive remote url and open it!!",
	contentURL: data.url("syncoff.png"),
	onClick: function() {
		updateState(!isEnabled, this);
	}
});

var page = require("page-worker").Page({
	contentScriptFile: data.url("webSocket.js"),
	contentURL: data.url("empty.html"),
	contentScriptWhen: "ready",
	onMessage: function(msg) {
		var prefix = "gsURL.page.";
		if (msg.indexOf(prefix) != 0) {
			return;
		} else {
			var args = msg.split("::");
			switch (args[0]) {
			case(prefix + "initialized") : updateState(isEnabled, widget);
				break;
			case (prefix + "open") : args.splice(0, 1);
				var url = args.join('::');
				tabs.open({
					url: url,
					onOpen: function onOpen(tab) {
						windows.activeWindow.activate()
					}
				});
				break;
			case (prefix + "connected") : widget.contentURL = data.url("syncon.png");
				break;
			case (prefix + "closed") : widget.contentURL = data.url("syncoff.png");
				break;
			case (prefix + "closedByServer") : widget.contentURL = data.url("syncoff.png");
				updateState(false, widget);
				break;
			case (prefix + "connectfailed") : widget.contentURL == data.url("syncoff.png");
				updateState(false, widget);
				break;
			case (prefix + "reconnect") : updateState(true, widget);
				break;
			}
		}
	}
});

