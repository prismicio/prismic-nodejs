const Prismic = require('prismic.io');
const Cookies = require('cookies');
const QuickRoutes = require('./quickroutes');

Prismic.init = (app, config, handleError) => {
  if (!config || !config.apiEndpoint) {
    throw new Error('Missing Prismic Api Endpoint');
  }

  QuickRoutes.setup(app, config, handleError);
};

Prismic.preview = (api, linkResolver, req, res) => {
  const token = req.query.token;
  if (token) {
    api.previewSession(token, linkResolver, '/').then((url) => {
      const cookies = new Cookies(req, res);
      cookies.set(Prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(301, url);
    }).catch((err) => {
      res.status(500).send(`Error 500 in preview: ${err.message}`);
    });
  } else {
    res.send(400, 'Missing token from querystring');
  }
};

module.exports = Prismic;
