## prismic-nodejs

*Prismic.io support for NodeJS*

[![npm version](https://badge.fury.io/js/prismic-nodejs.svg)](http://badge.fury.io/js/prismic-nodejs)
[![Dependency Status](https://david-dm.org/prismicio/prismic-nodejs.svg)](https://david-dm.org/prismicio/prismic-nodejs)

This is a set of helpers to use Prismic.io in a [NodeJS](http://nodejs.org/) application. Currently it only contains a helper to create a preview route. If you're starting from scratch, our [NodeJS SDK](https://github.com/prismicio/nodejs-sdk) is a good base.

### Installation

```javascript
npm install prismic-nodejs --save
```

### Usage

```javascript
const prismic = require('prismic-nodejs');
const PrismicConfig = require('./prismic-configuration');
```

The Prismic object is extended from the [Javascript Kit](https://github.com/prismicio/javascript-kit), so any attribute of the official kit, for example `Predicates`, is also available in the object exposed by express-prismic.

It is recommended to create a middleware method that will fetch the Api object for your repository and expose data to your templates:

```javascript
// This is the configuration for prismic.io
/*
 * Initialize prismic context and api
 */
app.use((req, res, next) => {
  Prismic.api(PrismicConfig.apiEndpoint, { accessToken: PrismicConfig.accessToken, req })
  .then((api) => {
    req.prismic = { api };
    res.locals.ctx = {
      endpoint: PrismicConfig.apiEndpoint,
      linkResolver: PrismicConfig.linkResolver,
    };
    next();
  }).catch((err) => {
    const message = err.status === 404 ? 'There was a problem connecting to your API, please check your configuration file for errors.' : `Error 500: ${err.message}`;
    res.status(err.status).send(message);
  });
});
```

You can then call it in your routes if you need to query your repository:

```javascript
app.route('/').get((req, res) => {
  req.prismic.api.getByUID('page', 'get-started')
    .then((document) => {
      res.render('index-prismic', { document });
    })
    .catch((err) => {
    // Don't forget error management
      res.status(500).send(`Error 500: ${err.message}`);
    });
});
```

### Previews

You can preview any document including drafts in your production site, securely. All you have to do is include this route:

```javascript
app.route('/preview').get((req, res) => (
  Prismic.preview(req.prismic.api, PrismicConfig.linkResolver, req, res)
));
```

Then:
* Configure the URL to that preview route in the settings of your repository
* Make sure that the [Prismic Toolbar](https://developers.prismic.io/documentation/developers-manual#prismic-toolbar) is included in your views

