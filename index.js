var Prismic = require('prismic.io');
var QuickRoutes = Prismic.QuickRoutes;
var Cookies = require('cookies');

Prismic.init = (app, config, handleError) => {
  if (!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';
  // catch all routes to attach api and context
  function setupMiddleware (app)  {
    app.route('*').get((req, res, next) => {
      Prismic.api(config.apiEndpoint, config.accessToken)
        .then((api) => {
          const pQuickRoutes = api.quickRoutesEnabled() ? api.quickRoutes() : Promise.resolve([])
          return pQuickRoutes.then(quickroutes => {
            //refresh app object with new quick routes
            hotReloadRoutes(app, quickroutes);

            //configure prismic context
            req.prismic = { api: api };
            res.locals.ctx = {
              endpoint: config.apiEndpoint,
              linkResolver: QuickRoutes.makeLinkResolver(quickroutes, config.linkResolver)
            };
            next();

          });
        })
        .catch((err) => {
          if (handleError) {
            handleError(err, req, res);
          } else {
            next(err);
          }
        });
    });
  };

  function quickRoutesURL() {
    return quickRoutes.filter(r => r.enabled).map((route) => QuickRoutes.toUrl(route));
  }

  // use quick routes to generate router
  function setupQuickRoutes(quickRoutes) {
    quickRoutes.filter(r => r.enabled).map((route, index) => {
      app.route(QuickRoutes.toUrl(route)).get((req, res, next) => {
        QuickRoutes.fetchData(req, res, route.fetchers)
          .then((data) => {
            res.render(route.view, data);
          })
          .catch((err) => {
            if (handleError) {
              handleError(err, req, res);
            } else {
              next(err);
            }
          });
      });
    });
  }

  function hotReloadRoutes (app, quickroutes) {
    const quickroutesURLs = quickroutes.filter(r => r.enabled).map((route) => QuickRoutes.toUrl(route));
    //reset quickroutes
    app._router.stack.filter(expressRoute => {
      if(!expressRoute) return;
      if(!expressRoute.route) return;

      const quickRouteIndex = quickroutesURLs.indexOf(expressRoute.route.path)
      if(-1 != quickRouteIndex) {
        app._router.stack.splice(quickRouteIndex, 1);
      }
    });
    //regenerate routes
    setupQuickRoutes(quickroutes);
  }

  return Prismic.api(config.apiEndpoint, config.accessToken)
  .then(api => setupMiddleware(app))
  .catch((e) => {
    switch(e.status) {
      case 401: return console.log('you don\'t have access to this repository.');
      case 404: return console.log('Cannot retrieve your prismic API, check your configuration.');
    }
  });
};

Prismic.preview = (api, linkResolver, req, res) => {
  var token = req.query['token'];
  if (token) {
    api.previewSession(token, linkResolver, '/').then((url) => {
      var cookies = new Cookies(req, res);
      cookies.set(Prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(301, url);
    }).catch((err) => {
      res.status(500).send("Error 500 in preview: " + err.message);
    });
  } else {
    res.send(400, "Missing token from querystring");
  }
};

module.exports = Prismic;
