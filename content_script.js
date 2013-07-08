var port = chrome.extension.connect();
port.onMessage.addListener(function(message) {
    if(message.request === 'page_info') {
        var pageInfo = {
            "url": document.location.href,
            "title": document.title,
            "selection": window.getSelection().toString()
        };

        console.log('get info for title ' + document.location.title);

        if (pageInfo.url.match(/^http[s]?:\/\/maps\.google\./) || pageInfo.url.match(/^http[s]?:\/\/www\.google\.[a-z]{2,3}(\.[a-z]{2})?\/maps/)) {
            var link = document.getElementById('link');
            if (link && link.href) {
                pageInfo.url = link.href;
            }
        }

        port.postMessage(pageInfo);
    }
});
