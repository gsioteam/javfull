class IndexController extends Controller {
    load() {
        this.data = {
            tabs: [
                {
                    "title": "Home",
                    "id": "home",
                    "url": "https://javfull.net/page/{0}/"
                }, 
                {
                    "title": "Top",
                    "id": "top",
                    "url": "https://javfull.net/top-jav-movies-this-month/"
                }
            ]
        };
    }
}

module.exports = IndexController;