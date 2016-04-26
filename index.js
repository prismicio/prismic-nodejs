var Prismic = require('prismic.io');
var Cookies = require('cookies');

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

