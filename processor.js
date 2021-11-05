
const decodeLink = require('./decode_link');

function base64decode(str) {
    return Buffer.from(str, 'base64').toString();
}

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
        console.log(`items ${items.length}`);

        this.value = {
            items: items,
        };
    }

    async processAjax(text, url) {
        return new Promise((resolve, reject) => {
            console.log(`test 1`);
            let ctx = this.ctx = new ScriptContext();
            console.log(`test 2`);
            let data = this.loadString('bundle.js');
            console.log(`test 3`);
            ctx.eval(data);
            console.log(`test 4`);
            ctx.postMessage({
                event: 'setup',
                data: {
                    location: url,
                }
            });
            console.log(`test 4`);
            ctx.onmessage = async function(ev) {
                let event = ev.event;
                let data = ev.data;

                switch (event) {
                    case 'ajax': {
                        try {
                            let reqUrl = new URL(data.url, url).toString();
                            console.log(`on ajax ${reqUrl} ${data.type}`);
                            let arr = [];
                            for (let key in data.data) {
                                arr.push(`${key}=${data.data[key]}`);
                            }
                            console.log(`body ${arr.join('&')}`);
                            let res = await fetch(reqUrl, {
                                headers: {
                                    'content-type': 'application/x-www-form-urlencoded',
                                },
                                body: arr.join('&'),
                                method: data.type,
                            });
                            let text = await res.text();
                            console.log('ajax_complete');
                            ctx.postMessage({
                                event: 'ajax_complete',
                                data: {
                                    id: data.id,
                                    body: text,
                                }
                            });
                        } catch (e) {
                            reject(e);
                        }
                        break;
                    }
                    case 'complete': {
                        console.log(`all complete ${JSON.stringify(data)}`);
                        resolve(data);
                        break;
                    }
                }
            };
            // this.onAjax = glib.Callback.fromFunction((data) => {
            //     try {
            //         let d = data.toObject();
            //         console.log(`ajax ${href.href(d.url)}`);
            //         let req = glib.Request.new(d.type, href.href(d.url));
            //         let arr = [];
            //         for (let key in d.data) {
            //             arr.push(`${key}=${d.data[key]}`);
            //         }
            //         req.setBody(glib.Data.fromString(arr.join('&')));
            //         req.setHeader('content-type', 'application/x-www-form-urlencoded');
            //         this.callback = glib.Callback.fromFunction(() => {
            //             console.log('complete!');
            //             let body = req.getResponseBody();
            //             d.success(body.text(), 'OK');
            //         });
            //         req.setOnComplete(this.callback);
            //         req.start();
            //         console.log('start ' + JSON.stringify(d));
            //     } catch (e) {
            //         reject(e);
            //     }
            // });
            // this.onComplete = glib.Callback.fromFunction((options) => {
            //     resolve(options.toObject());
            // });
            console.log(`test 10 ${text}`);
            ctx.eval(text);
            console.log(`test 11`);
        });
    }

    async loadQuickVideo(url) {
        console.log("req " + url);
        let request = new Request(
            url,
            {
                headers: {
                    referer: 'https://javfull.net/'
                }
            }
        );
        let response = await fetch(request);
        let doc = HTMLParser.parse(await response.text());
        console.log("complete " + url);

        let scripts = doc.querySelectorAll('script:not([src])');
        let selText;
        let selLength = 0;
        for (let script of scripts) {
            let text = script.text;
            if (text.match(/play\/ajax/)) {
                selText = text;
                selLength = text.length;
                break;
            }
        }
        if (selText) {
            let items = [];
            let data = await this.processAjax(selText, url);
            for (let source of data.sources) {
                items.push({
                    title: source.label,
                    url: source.src,
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
        return [];
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