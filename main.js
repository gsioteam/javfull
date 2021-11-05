
class MainController extends Controller {

    load(data) {
        this.id = data.id;
        this.url = data.url;
        this.page = 0;

        var cache = this.readCache();
        let list;
        if (cache) {
            list = cache.items;
        } else {
            list = [];
        }

        this.data = {
            list: list,
            loading: false,
            loadMore: this.id == 'home'
        };

        if (cache) {
            let now = new Date().getTime();
            if (now - cache.time > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }
    }

    async onPressed(index) {
        var data = this.data.list[index];
        openVideo(data.link, data);
    }

    onRefresh() {
        this.reload();
    }

    async onLoadMore() {
        this.setState(() => {
            this.data.loading = true;
        });

        let page = this.page + 1;
        let url = this.makeURL(page);
        let res = await fetch(url);
        let html = await res.text();
        this.page = page;
        let items = this.parseHtml(html, url);

        this.setState(()=>{
            for (let item of items) {
                this.data.list.push(item);
            }
            this.data.loading = false;
        });
        
    }

    makeURL(page) {
        return this.url.replace('{0}', page);
    }

    async reload() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let url = this.makeURL(0);
            let res = await fetch(url);
            let html = await res.text();
            let items = this.parseHtml(html, url);
            this.page = 0;
            localStorage['cache_' + this.id] = JSON.stringify({
                time: new Date().getTime(),
                items: items,
            });
            this.setState(()=>{
                this.data.list = items;
                this.data.loading = false;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(()=>{
                this.data.loading = false;
            });
        }
    }

    readCache() {
        let cache = localStorage['cache_' + this.id];
        if (cache) {
            let json = JSON.parse(cache);
            return json;
        }
    }

    parseHtml(html, url) {
        let doc = HTMLParser.parse(html);

        let nodes = doc.querySelectorAll('#renderTemp > div');

        let items = [];
        for (let node of nodes) {
            let img = node.querySelector('.video-thumb');

            items.push({
                title: node.querySelector('.video-title').text,
                subtitle: node.querySelector('.video-meta').text,
                link: node.querySelector('.video-link').getAttribute('href'),
                picture: img.getAttribute('data-src')
            });
        }
        return items;
    }
}

module.exports = MainController;