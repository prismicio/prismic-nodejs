var Prismic = require('prismic.io');
var QuickRoutes = Prismic.QuickRoutes;
var Cookies = require('cookies');

Prismic.init = (app, config, handleError) => {
  if (!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';

  // catch all routes to attach api and context
  function setupMiddleware (app)  {
    app.route('*').get(function prismicMiddleware(req, res, next) {
      Prismic.api(config.apiEndpoint, config.accessToken)
        .then((api) => {
          const pQuickRoutes = api.quickRoutesEnabled()  ? api.quickRoutes() : Promise.resolve([])
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

  // use quick routes to generate router
  function setupQuickRoutes(app, quickroutes) {
    quickroutes.filter(r => r.enabled).map((route, index) => {
      app.route(QuickRoutes.toUrl(route)).get((req, res, next) => {
        QuickRoutes.fetchData(req, res, route.fetchers)
          .then((data) => {
            if(!data[route.forMask]) {
              res.status(404);
              next();
            } else {
              res.render(route.view, data);
            }
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

  function quickroutesURLs(quickroutes) {
    return quickroutes.map((route) => QuickRoutes.toUrl(route));
  }

  function hotReloadRoutes (app, quickroutes) {
    //reset quickroutes
    const routeStack = app._router.stack.reduce((acc, expressRoute) => {
      if(!expressRoute.route) return acc.concat([expressRoute]);

      const quickRouteIndex = quickroutesURLs(quickroutes).indexOf(expressRoute.route.path);
      if(-1 != quickRouteIndex) {
        return acc;
      } else {
        return acc.concat([expressRoute]);
      }
    }, []);
    app._router.stack = routeStack;
    //regenerate routes
    setupQuickRoutes(app, quickroutes);
  }

  setupMiddleware(app);
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
