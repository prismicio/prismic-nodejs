const Prismic = require('prismic.io');

const QuickRoutes = Prismic.QuickRoutes;

// Use quick routes to generate router
function setupQuickRoutes(app, quickroutes, handleError) {
  quickroutes.filter(r => r.enabled).forEach((route) => {
    app.route(QuickRoutes.toUrl(route)).get((req, res, next) => {
      QuickRoutes.fetchData(req, res, route.fetchers).then((data) => {
        if (!data[route.forMask]) {
          res.status(404);
          next();
        } else {
          res.render(route.view, data);
        }
      }).catch((err) => {
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
  return quickroutes.map(route => QuickRoutes.toUrl(route));
}

function hotReloadRoutes(app, quickroutes, handleError) {
  // Reset quickroutes
  const routeStack = app._router.stack.reduce((acc, expressRoute) => {
    if (!expressRoute.route) return acc.concat([expressRoute]);

    const quickRouteIndex = quickroutesURLs(quickroutes).indexOf(expressRoute.route.path);
    if (quickRouteIndex !== -1) {
      return acc;
    }
    return acc.concat([expressRoute]);
  }, []);

  app._router.stack = routeStack; // eslint-disable-line no-param-reassign

  // Regenerate routes
  setupQuickRoutes(app, quickroutes, handleError);
}

// Catch all routes to attach api and context
function setupMiddleware(app, config, handleError) {
  app.route('*').get((req, res, next) => {
    Prismic.api(config.apiEndpoint, config.accessToken).then((api) => {
      const pQuickRoutes = api.quickRoutesEnabled() ? api.quickRoutes() : Promise.resolve([]);
      return pQuickRoutes.then((quickroutes) => {
        // Refresh app object with new quick routes
        hotReloadRoutes(app, quickroutes, handleError);

        // Configure prismic context
        req.prismic = { api }; // eslint-disable-line no-param-reassign
        res.locals.ctx = { // eslint-disable-line no-param-reassign
          endpoint: config.apiEndpoint,
          linkResolver: QuickRoutes.makeLinkResolver(quickroutes, config.linkResolver),
        };
        next();
      });
    }).catch((err) => {
      if (handleError) {
        handleError(err, req, res);
      } else {
        next(err);
      }
    });
  });
}

module.exports = {
  setup: setupMiddleware,
};
