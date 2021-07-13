const {Collection} = require('./collection');
const crossCloudfare = require('./cross_cloudfare');
const {setup} = require('./bundle');

class QuickVideoCollection extends Collection {

    async processAjax(text, href) {
        return new Promise((resolve, reject) => {
            let ctx = this.ctx = glib.ScriptContext.new('js');
            let data = glib.FileData.new(`${__dirname}/bundle.js`);
            ctx.eval(data.toString());
            let cb = ctx.eval('_setup');
            this.onAjax = glib.Callback.fromFunction((data) => {
                try {
                    let d = data.toObject();
                    console.log(`ajax ${href.href(d.url)}`);
                    let req = glib.Request.new(d.type, href.href(d.url));
                    let arr = [];
                    for (let key in d.data) {
                        arr.push(`${key}=${d.data[key]}`);
                    }
                    req.setBody(glib.Data.fromString(arr.join('&')));
                    req.setHeader('content-type', 'application/x-www-form-urlencoded');
                    this.callback = glib.Callback.fromFunction(() => {
                        console.log('complete!');
                        let body = req.getResponseBody();
                        d.success(body.text(), 'OK');
                    });
                    req.setOnComplete(this.callback);
                    req.start();
                    console.log('start ' + JSON.stringify(d));
                } catch (e) {
                    reject(e);
                }
            });
            this.onComplete = glib.Callback.fromFunction((options) => {
                resolve(options.toObject());
            });
            cb.apply({
                location: href.url,
                onAjax: this.onAjax,
                onComplete: this.onComplete
            });
            ctx.eval(text);
        });
    }

	async fetch(url) {
        console.log('url: ' + url);
        let doc = await super.fetch(url, {
            headers: {
                referer: 'https://javfull.net/'
            }
        });
        let scripts = doc.querySelectorAll('script:not([src])');
        let selText;
        let selLength = 0;
        for (let script of scripts) {
            let text = script.text;
            if (text.length > selLength) {
                selText = text;
                selLength = text.length;
            }
        }
        if (selText) {
            let items = [];
            let data = await this.processAjax(selText, new PageURL(url));
            for (let source of data.sources) {
                let item = glib.DataItem.new();
                item.title = source.label;
                item.link = url;
                item.data = {
                    url: source.src,
                    headers: {
                        referer: url,
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
                        accept: '*/*',
                        'accept-encoding': 'deflate, gzip'
                    }
                };
                items.push(item);
            }
            return items;
        }
        return [];
    }

    reload(_, cb) {
        this.fetch(this.url).then((results)=>{
            this.setData(results);
            cb.apply(null);
        }).catch(function(err) {
            if (err instanceof Error) {
                console.log("Err " + err.message + " stack " + err.stack);
                err = glib.Error.new(305, err.message);
            }
            cb.apply(err);
        });
        return true;
    }
}

class JavclCollection extends Collection {

    request(url, ops) {
        let headers, body;
        if (ops) {
            headers = ops.headers;
            body = ops.body;
        }
        return new Promise((resolve, reject)=>{
            console.log('url : ' + url);
            let req = glib.Request.new('POST', url);
            if (headers) {
                for (let key in headers) {
                    req.setHeader(key, headers[key]);
                }
            }
            this.callback = glib.Callback.fromFunction(function() {
                if (req.getError()) {
                    reject(glib.Error.new(302, "Request error " + req.getError()));
                } else {
                    let body = req.getResponseBody();
                    if (body) {
                        resolve(body.text());
                    } else {
                        reject(glib.Error.new(301, "Response null body"));
                    }
                }
            });
            req.setBody(glib.Data.fromString(body));
            req.setOnComplete(this.callback);
            req.start();
        });
    }

	async fetch(url) {
        console.log('t1');
        let uri = new URL(url);
        console.log(url);
        console.log(JSON.stringify(uri));
        let id = uri.pathname.substr(uri.pathname.lastIndexOf('/') + 1);
        let text = await this.request('https://javcl.me/api/source/' + id, {
            body: 'r=https%3A%2F%2Fjavfull.net%2F&d=javcl.me',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            }
        });

        let items = [];
        let json = JSON.parse(text);
        for (let data of json.data) {
            let item = glib.DataItem.new();
            item.title = data.label;
            item.link = url;
            item.data = {
                url: data.file,
                headers: {
                    referer: url,
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
                    accept: '*/*',
                    'accept-encoding': 'deflate, gzip'
                }
            };
            items.push(item);
        }
        
        return items;
    }

    reload(_, cb) {
        this.fetch(this.url).then((results)=>{
            this.setData(results);
            cb.apply(null);
        }).catch(function(err) {
            if (err instanceof Error) {
                console.log("Err " + err.message + " stack " + err.stack);
                err = glib.Error.new(305, err.message);
            }
            cb.apply(err);
        });
        return true;
    }
}

module.exports = function(item) {
    let link = item.link;
    if (link.match(/quickvideo\.net/)) {
        return QuickVideoCollection.new(item);
    }  else if (link.match(/javcl\.me/)) {
        return JavclCollection.new(item);
    }
    return null;
};