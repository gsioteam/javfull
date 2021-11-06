
const decodeLink = require('./decode_link');

class VideoProcesser extends Processor {
    async load(data) {
        this.value = {
            title: data.title,
            subtitle: data.subtitle,
            link: data.link,
        };
        console.log(`start ${data.link}`);
        let res = await fetch(data.link);
        let text = await res.text();
        let doc = HTMLParser.parse(text);
        
        let id = doc.querySelector('.id').getAttribute('data');
        let lists = doc.querySelectorAll('.box-server > div');
        console.log(`res ${lists.length}`);
        let items = [];
        for (let list of lists) {
            let title = list.querySelector('span').text.trim().replace(':', '');
            let links = list.querySelectorAll('a');
            for (let link of links) {
                let source = link.getAttribute('data');
                let url = decodeLink(id, source);
                if (url.match(/quickvideo\.net/) || 
                    url.match(/javcl\.me/)) {
                    items.push({
                        title: link.text,
                        subtitle: title,
                        key: url,
                    });
                } else {
                    console.log(`Unsupport ${link}`);
                }
            }
        }

        this.value = {
            items: items,
        };
    }


    loadVideoUrl(src) {
        return new Promise((resolve, reject) => {
            let webView = new HiddenWebView({
                resourceReplacements: [{
                    test:'jwplayer\.js',
                    resource: this.loadString('my_jwplayer.js'),
                    mimeType: 'text/javascript',
                }]
            });
            let cleanUp = () => {
                this.webView = null;
            }; 
            webView.load(src);
            webView.onmessage = (ev) => {
                let event = ev.event;
                let data = ev.data;
                switch (event) {
                    case 'complete': {
                        let items = [];
                        try {
                            let sources;
                            if (data.sources.length) {
                                sources = data.sources;
                            } else {
                                sources = [data.sources];
                            }
                            for (let source of sources) {
                                items.push({
                                    title: source.type,
                                    url: source.file
                                });
                            }
                        } catch (e) {
                            reject(e);
                            cleanUp();
                            return;
                        }
                        resolve(items);
                        cleanUp();
                        break;
                    }
                }
            };
            this.webView = webView;
        });
    }

    async loadQuickVideo(url) {
        let items = await this.loadVideoUrl(url);

        if (items != null && items.length > 0)
            localStorage[`video:${url}`] = JSON.stringify(items);
        return items;
    }

    async loadJavcl(url) {
        let uri = new URL(url);
        let id = uri.pathname.substr(uri.pathname.lastIndexOf('/') + 1);
        let res = await fetch('https://javcl.me/api/source/' + id, {
            body: 'r=https%3A%2F%2Fjavfull.net%2F&d=javcl.me',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            method: 'POST'
        });
        let text = await res.text();

        let items = [];
        let json = JSON.parse(text);
        for (let data of json.data) {
            items.push({
                title: data.label,
                url: data.file,
                headers: {
                    referer: url,
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
                    accept: '*/*',
                    'accept-encoding': 'deflate, gzip'
                }
            });
        }
        localStorage[`video:${url}`] = JSON.stringify(items);
        
        return items;
    }

    async getVideo(key, data) {
        var cache = localStorage[`video:${key}`];
        if (cache) {
            console.log(`Read cached ${cache}`);
            return JSON.parse(cache);
        }

        let url = key;
        if (url.match(/quickvideo\.net/)) {
            return await this.loadQuickVideo(url);
        } else if (url.match(/javcl\.me/)) {
            return await this.loadJavcl(url);
        }
        return [];
    }

    async getResolution(data) {

    }

    clearVideoCache(key) {
        localStorage.removeItem(`video:${key}`);
    }
}

module.exports = VideoProcesser;