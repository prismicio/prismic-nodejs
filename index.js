var Prismic = require('prismic.io');
var QuickRoutes = Prismic.QuickRoutes;
var Cookies = require('cookies');

Prismic.init = function(app, config, handleError) {
  if(!config || !config.apiEndpoint) throw 'Missing Prismic Api Endpoint';

  return Prismic.api(config.apiEndpoint, config.accessToken)
    .then(api => api.quickRoutes())
    .then(quickRoutes => {

      app.route('*').get((req, res, next) => {
        Prismic.api(config.apiEndpoint, config.accessToken)
          .then((api) => {
            req.prismic = { api: api };
            res.locals.ctx = {
              linkResolver: QuickRoutes.buildReverseRouter(quickRoutes, config.linkResolver),
              endpoint: config.apiEndpoint
            };
            next();
          })
          .catch((err) => next(err));
      });

      quickRoutes.filter(r => r.enabled).map(function(route, index) {
        var url = QuickRoutes.buildURL(route.fragments);
        app.route(url).get(function(req, res, next) {
          QuickRoutes.fetchData(req, res, route.fetchers)
            .then(function(data) {
              res.render(route.view, data);
            })
            .catch(function(err) {
              handleError(err, req, res);
            });
        });
      });
    });
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
