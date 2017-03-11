var Prismic = require('prismic.io');
var QuickRoutes = Prismic.QuickRoutes;
var Cookies = require('cookies');

Prismic.getAPI = function (configuration, req, res) {
  return Prismic
    .api(configuration.apiEndpoint, {accessToken: configuration.accessToken, req})
    .then(api => {
      req.prismic = {api};
      const expId = api.experiments.current() && api.experiments.current().googleId();
      res.locals.ctx = {
        endpoint: configuration.apiEndpoint,
        expId: expId,
        linkResolver: configuration.linkResolver,
      };
    });
}

Prismic.init = (app, config, handleError) => {
  if (!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';

  // catch all routes to attach api and context
  function setupMiddleware (linkResolver)  {
    app.route('*').get((req, res, next) => {
      Prismic.api(config.apiEndpoint, config.accessToken)
        .then((api) => {
          req.prismic = {api};
          const expId = api.experiments.current() && api.experiments.current().googleId();
          res.locals.ctx = {
            endpoint: config.apiEndpoint,
            expId: expId,
            linkResolver: linkResolver,
          };
          next();
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

  return Prismic.api(config.apiEndpoint, config.accessToken).then(api => {
    if (api.quickRoutesEnabled()) {
      api.quickRoutes().then(quickRoutes => {
        var linkResolver = QuickRoutes.makeLinkResolver(quickRoutes, config.linkResolver);
        setupMiddleware(linkResolver);
        setupQuickRoutes(quickRoutes);
      });
    } else {
      setupMiddleware(config.linkResolver);
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
