var Prismic = require('prismic.io');
var Cookies = require('cookies');

const dynRoutes = [
  {
    "id": "bloghome",
    "mask": "bloghome",
    "fragments": [],
    "fetchers": [
      {"name": "bloghome", "mask": "bloghome", "condition": {"kind": "singleton"}}
    ],
    "view": "bloghome",
  }, {
    "id": "post",
    "mask": "post",
    "fragments": [
      {"kind": "static", "value": "blog"},
      {"kind": "dynamic", "key": "post_uid"}
    ],
    "fetchers": [
      {"name": "post", "mask": "post", "condition": {"kind": "withUid", "key": "post_uid"}},
    ],
    "view": "post",
  }
]

var Kind = {
  Dynamic: 'dynamic',
  Static: 'static'
}

var Condition = {
  UID: 'withUid',
  Singleton: 'singleton'
}

function buildURL(fragments) {
  if(!fragments || fragments.length == 0) return '/'
  else {
    return fragments.reduce(function (acc, f) {
      switch(f.kind) {
        case Kind.Dynamic:
          return acc + '/:' + f.key

        case Kind.Static:
          return acc + '/' + f.value

      }
    }, '')
  }
}

function mergeJson(obj, part) {
  var res = Object.assign({}, obj)
  Object.keys(part).forEach(function (key) {
    return res[key] = part[key]
  })
  return res
}

function fetchData(req, res, fetchers) {
  return new Promise((resolve, reject) => {
    var pData = fetchers.map(function(f, index) {
      switch(f.condition.kind) {
        case Condition.UID:
          return req.prismic.api.getByUID(f.mask, req.params[f.condition.key])
          .then(function(doc) {
            var obj = {}
            obj[f.name] = doc
            return obj
          })
          .catch(function(err) {
            reject(err)
          })

        case Condition.Singleton:
          return req.prismic.api.getSingle(f.mask)
          .then(function(doc) {
            var obj = {}
            obj[f.name] = doc
            return obj
          })
          .catch(function(err) {
            reject(err)
          })
      }
    })
    Promise.all(pData).then(function(results) {
      resolve(results.reduce(function(acc, res) {
        return mergeJson(acc, res)
      }, {}))
    })
  })
}

function buildReverseRouter(dynRoutes) {
  return function(doc) {
    var docRoute = dynRoutes.find(function(dr) {
      return dr.mask === doc.type
    })
    return buildURL(docRoute.fragments)
  }
}

Prismic.init = function(app, config, manualRouting, handleError) {
  if(!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';


  app.route('*').get((req, res, next) => {
    Prismic.api(config.apiEndpoint, config.accessToken)
    .then((api) => {
      req.prismic = {}
      req.prismic.api = api
      res.locals.ctx = {
        linkResolver: buildReverseRouter(dynRoutes),
        endpoint: config.apiEndpoint
      }
      next()
    })
  })

  dynRoutes.map(function(route, index) {
    var url = buildURL(route.fragments)
    app.route(url).get(function(req, res, next) {
      fetchData(req, res, route.fetchers)
      .then(function(data) {
        if(manualRouting) {
          req.prismic[route.id] = {view: route.view, data}
          next()
        } else {
          res.render(route.view, data)
        }
      })
      .catch(function(err) {
        handleError(err, req, res)
      })
    })
  })
}

Prismic.preview = function(api, linkResolver, req, res) {
  var token = req.query['token'];
  if (token) {
    api.previewSession(token, linkResolver, '/').then(function(url) {
      var cookies = new Cookies(req, res);
      cookies.set(Prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(301, url);
    }).catch(function(err) {
      res.status(500).send("Error 500 in preview: " + err.message);
    });
  } else {
    res.send(400, "Missing token from querystring");
  }
};

module.exports = Prismic;

