
class Engine {
    createLoaderClass() {
        return {};
    }
}

globalThis.atob = function(txt) {
  return Buffer.from(txt, 'base64').toString();
};
globalThis.btoa = function(txt) {
  return Buffer.from(txt).toString('base64');
};
globalThis.p2pml = {
    hlsjs: {
        Engine: Engine,
        initVideoJsHlsJsPlugin() {
            return true;
        },
        initJwPlayer() {
            return true;
        }
    }
};
p2pml.hlsjs.Engine.isSupported = ()=>{
    return true;
}

globalThis.client = {
  init: function(data) {
    function as(t) {
      var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
      return null == e && (e = "2"),
      Array.from(t, (function(t, n) {
          return String.fromCharCode(t.charCodeAt() ^ e.charCodeAt(n % e.length))
      }
      )).join("")
    }
    console.log(`${data} to ${as(data)}`);
    postMessage({
      event: 'complete',
      data: {
        sources: [{
          label: 'v1',
          src: as(data),
        }]
      } 
    });
  }
};
globalThis.videojs = function(id, options) {
  postMessage({
    event: 'complete',
    data: options
  });
};
globalThis.jwplayer = function() {
    return {
        setMute: function() {},
        setup: function(options) {
            let ops = {sources: []};
            for (let data of options.sources) {
                ops.sources.push({
                    label: data.label,
                    src: data.file
                });
            }
            postMessage({
              event: 'complete',
              data: ops
            });
        },
        setCurrentQuality: function() {
        },
        getQualityLevels: function() {},
        on: function() {}
    };
};
globalThis.jwplayer_hls_provider = {
    attach: function() {}
};
let requestData = {};
let idCounter = 1;
globalThis.$ = globalThis.jQuery = {
    ajax(data) {
      let id = idCounter++;
      requestData[id] = data;
      data.id = id;
      postMessage({
        event: "ajax",
        data: data,
      });
    },
    post(url, data, func) {
      let id = idCounter++;
      let reqData = {
        url: url,
        type: 'POST',
        data: data,
        success: function (res) {
            console.log('success ' + func);
            func(res);
        }
      };
      requestData[id] = reqData;
      reqData.id = id;
      postMessage({
        event: "ajax",
        data: reqData,
      });
    },
    getScript() {
    }
};
function printFunction(label, args) {
    console.log(label, ...args);
}
class Element {
    constructor() {
        this.style = {};
        this.children = [];
    }
    appendChild() {
    }
    setAttribute() {
    }
}

globalThis.document = {
    createElement() {
        return new Element();
    },
    getElementById() {
        return new Element();
    },
    getElementsByTagName() {
        return [new Element()];
    },
    createTextNode() {
        return new Element();
    }
};
globalThis.navigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36'
};

globalThis.onmessage = function (ev) {
  let event = ev.event;
  let data = ev.data;
  console.log(`onmessage ${event}: ${JSON.stringify(data)}`);
  switch (event) {
    case 'setup': {
      globalThis.window = {
        location: new URL(data.location)
      };
      break;
    }
    case 'ajax_complete': {
      let id = data.id;
      let req = requestData[id];
      req.success(data.body, 'OK');
      break;
    }
  }
}
