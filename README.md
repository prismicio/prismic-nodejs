## prismic-nodejs

*Prismic.io support for NodeJS*

[![npm version](https://badge.fury.io/js/express-prismic.svg)](http://badge.fury.io/js/express-prismic)

This is a set of helpers to use Prismic.io in a [NodeJS](http://nodejs.org/) application. Currently it only contains a helper to create a preview route. If you're starting from scratch, our [NodeJS SDK](https://github.com/prismicio/nodejs-sdk) is a good base.

### Installation

```javascript
npm install prismic-nodejs --save
```

### Usage

```javascript
var prismic = require('prismic-nodejs');
```

The Prismic object is extended from the [Javascript Kit](https://github.com/prismicio/javascript-kit), so any attribute of the official kit, for example `Predicates`, is also available in the object exposed by express-prismic.

It is recommended to create an `api()` method that will fetch the Api object for your repository, with the correct parameters:

```javascript
// This is the configuration for prismic.io
var ENDPOINT = "http://<your-repository>.prismic.io/api";
var ACCESSTOKEN = null; // Only if your API is private
var LINKRESOLVER = function(doc) { // Describe your reverse routing here
  return '/' + doc.type + '/' + doc.id;
}
// This method will return a Promise of Api object
function api(req, res) {
  res.locals.ctx = { // So we can use this information in the views
    endpoint: ENDPOINT,
    linkResolver: LINKRESOLVER
  };
  return Prismic.api(ENDPOINT, {
    accessToken: ACCESSTOKEN,
    req: req
  });
}
```

You can then call it in your routes if you need to query your repository:

```javascript
app.route('/').get(function(req, res) {
  api(req).then(function (api) {
    api.getByUID('page', 'get-started', function (err, document) {
      res.render('index-prismic', {
        document: document
      });
    });
  }).catch(function(err) {
    // Don't forget error management
    res.status(500).send("Error 500: " + err.message);
  });
});
```

### Previews

You can preview any document including drafts in your production site, securely. All you have to do is include this route:

```javascript
app.route('/preview').get(function(req, res) {
  api(req).then(function(api) {
    return Prismic.preview(api, configuration.linkResolver, req, res);
  }).catch(function(err) {
    handleError(err, req, res);
  });
});
```

Then:
* Configure the URL to that preview route in the settings of your repository
* Make sure that the [Prismic Toolbar](https://developers.prismic.io/documentation/developers-manual#prismic-toolbar) is included in your views

