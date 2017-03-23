var Prismic = require('prismic.io');
var QuickRoutes = Prismic.QuickRoutes;
var Cookies = require('cookies');

Prismic.init = function(app, config, handleError) {
  if (!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';

  // catch all routes to attach api and context
  function setupMiddleware (app)  {
    app.route('*').get(function prismicMiddleware(req, res, next) {
      Prismic.api(config.apiEndpoint, config.accessToken).then(function(api) {
        var pQuickRoutes = api.quickRoutesEnabled() ? api.quickRoutes() : Promise.resolve([]);
        return pQuickRoutes.then(function(quickroutes) {
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
      }).catch(function(err) {
        if (handleError) {
          handleError(err, req, res);
        } else {
          next(err);
        }
      });
    });
  }

  // use quick routes to generate router
  function setupQuickRoutes(app, quickroutes) {
    quickroutes.filter(function(r) {
      return r.enabled;
    }).map(function(route) {
      app.route(QuickRoutes.toUrl(route)).get(function(req, res, next) {
        QuickRoutes.fetchData(req, res, route.fetchers).then(function(data) {
          if (!data[route.forMask]) {
            res.status(404);
            next();
          } else {
            res.render(route.view, data);
          }
        }).catch(function(err) {
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
    return quickroutes.map(function(route) {
      return QuickRoutes.toUrl(route);
    });
  }

  function hotReloadRoutes (app, quickroutes) {
    //reset quickroutes
    var routeStack = app._router.stack.reduce(function(acc, expressRoute) {
      if (!expressRoute.route) return acc.concat([expressRoute]);

      var quickRouteIndex = quickroutesURLs(quickroutes).indexOf(expressRoute.route.path);
      if (-1 != quickRouteIndex) {
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
