var host = 'https://www.pushbullet.com'; // 'http://localhost:5000';

function getApiKey(done) {
    var xhr = new XMLHttpRequest();
        xhr.open('GET', host + '/user/api_key', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    done(response);
                } else if (xhr.status === 404) {
                    done(null);
                } else {
                }
            }
        };
        xhr.send();
}

function getDevices(done) {
    if (localStorage.api_key == undefined) {
        getApiKey(function(response) {
            if (response != null) {
                localStorage.api_key = response.api_key
                requestDevices(function(response) {
                    done(response);
                });
            } else {
                done(null);
            }
        });
    } else {
        requestDevices(function(response) {
            done(response);
        });
    }
}

function requestDevices(done) {
    var xhr = new XMLHttpRequest();
        xhr.open('GET', host + '/api/devices', true);
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(localStorage.api_key + ':'));
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    updateContextMenus(response);
                    done(response);
                } else if (xhr.status === 404) {
                    updateContextMenus(null);
                    done(null);
                } else if (xhr.status === 401) {
                    delete localStorage.api_key;
                    updateContextMenus(null);
                    done(null);
                } else {
                }
            }
        };
        xhr.send();
}

function sendPush(push, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', host + '/api/pushes', true);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(localStorage.api_key + ':'));
    xhr.setRequestHeader("Content-type","application/json");
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                done();
            } else {
                onError();
            }
        }
    };
    xhr.send(JSON.stringify(push));
}

function getPageInfo(done) {
    if (activePort != undefined) {
        activePort.onMessage.addListener(function(message) {
            done(message);
        });
        activePort.postMessage({ 'request': 'page_info' })
    }
}

function openTab(url) {
    chrome.tabs.create({ 'url': url }, function(tab) { });
}

function onError() {
    chrome.tabs.create({'url': chrome.extension.getURL('fail.html')}, function(tab) { });
}

var contentScriptPorts = new Object();
var activePort;
chrome.extension.onConnect.addListener(function(port) {
    activePort = port;
    contentScriptPorts[port.sender.tab.id] = port;

    port.onDisconnect.addListener(function() {
        delete contentScriptPorts[port.sender.tab.id];
        if (activePort === port) {
            activePort = undefined;
        }
    });
});

chrome.tabs.onSelectionChanged.addListener(function(tabId, changeInfo, tab) {
    activePort = contentScriptPorts[tabId];
});

getDevices(function(devices) { });

function updateContextMenus(response) {
    chrome.contextMenus.removeAll();

    if (response != null) {
        for (var i = 0, n = response.devices.length; i < n; i++) {
            var device = response.devices[i];
            device.extras.manufacturer = device.extras.manufacturer.charAt(0).toUpperCase() + device.extras.manufacturer.slice(1);
            
            (function(deviceId) {
                var deviceName = device.extras.nickname || device.extras.manufacturer + ' ' + device.extras.model;
                
                chrome.contextMenus.create({ 'title': 'Push this page to my ' + deviceName
                                           , 'contexts': ['page']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'link', 'device_id': deviceId, 'title': tab.title, 'url': info.pageUrl }, function() { });
                                           }});
                chrome.contextMenus.create({ 'title': 'Push this link to my ' + deviceName
                                           , 'contexts': ['link']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'link', 'device_id': deviceId, 'title': 'Link', 'url': info.linkUrl }, function() { });
                                           }});
                chrome.contextMenus.create({ 'title': 'Push this selection to my ' + deviceName
                                           , 'contexts': ['selection']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'note', 'device_id': deviceId, 'title': 'Selection', 'body': info.selectionText }, function() { });
                                           }});
            })(device.id);
        }

        if (response.shared_devices == undefined)
            return;
        
        for (var i = 0, n = response.shared_devices.length; i < n; i++) {
            var device = response.shared_devices[i];
            device.extras.manufacturer = device.extras.manufacturer.charAt(0).toUpperCase() + device.extras.manufacturer.slice(1);
            
            (function(deviceId) {
                var deviceName = device.extras.nickname || device.extras.manufacturer + ' ' + device.extras.model;

                chrome.contextMenus.create({ 'title': 'Push this page to ' + device.owner_name + '\'s ' + deviceName
                                           , 'contexts': ['page']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'link', 'device_id': deviceId, 'title': tab.title, 'url': info.pageUrl }, function() { });
                                           }});
                chrome.contextMenus.create({ 'title': 'Push this link to ' + device.owner_name + '\'s ' + deviceName
                                           , 'contexts': ['link']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'link', 'device_id': deviceId, 'title': 'Link', 'url': info.linkUrl }, function() { });
                                           }});
                chrome.contextMenus.create({ 'title': 'Push this selection to ' + device.owner_name + '\'s ' + deviceName
                                           , 'contexts': ['selection']
                                           , 'onclick': function(info, tab) {
                                                sendPush({ 'type': 'note', 'device_id': deviceId, 'title': 'Selection', 'body': info.selectionText }, function() { });
                                           }});
            })(device.id);
        }
    }
}
