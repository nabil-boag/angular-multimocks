Angular Multimocks
==================

Travis Status
-------------
[![Build Status](https://travis-ci.org/wongatech/angular-multimocks.svg?branch=master)](https://travis-ci.org/wongatech/angular-multimocks)

Demo
----
<http://tech.wonga.com/angular-multimocks/>

Angular Multimocks lets you test how your app behaves with different responses
from an API.

Angular Multimocks allows you to define sets of mock API responses for different
scenarios as JSON files. A developer of an e-commerce app could set up scenarios
for a new customer, one who is registered and one who has an order outstanding.

Angular Multimocks allows you to switch between scenarios using a query string
parameter:
```
?scenario=foo
```

You can use Angular Multimocks to quickly test your app works in all situations
while developing or to provide mock data for a suite of automated acceptance
tests.

Example Use Case
----------------

You have an application which calls to `http://example.com/cart` to get a list
of items in the customer's shopping cart. You'd like to be able to easily
switch between different API responses so that you can test the various use
cases. You may want responses for the following:

| Scenario                              | URL                             |
| ------------------------------------- | ------------------------------- |
| Shopping cart is empty                | `/cart?scenario=emptyCart`      |
| Shopping cart with a quick buy option | `/cart?scenario=quickBuyCart`   |
| Shopping cart with out of stock items | `/cart?scenario=outOfStockCart` |

Demo App
--------

See `app/src/demo/` for a demo app. Inside the demo app, run `grunt` to generate the
mocks, then open `index.html` in your browser.

Usage
-----

NPM
-----

```sh
npm install --save angular-multimocks
```

Include `angular-multimocks.js` or `angular-multimocks.min.js` in your
application:

```html
<script src="node_modules/angular-multimocks/app/package/js/angular-multimocks.min.js"></script>
```

Dependencies
------------

Angular Multimocks depends on Angular Mocks and lodash, include them both in your application. For example:

```html
<script src="node_modules/angular-mocks/angular-mocks.js"></script>
<script src="node_modules/lodash/dist/lodash.js"></script>
```

It's worth noting that Angular Multimocks depends on a method in lodash that is not in underscore.

Add the `scenario` module to your application:

```javascript
angular
  .module('demo', ['scenario'])
  // more code here...
```

Mock Format
-----------

Resource files look like this:

```json
{
  "httpMethod": "GET",
  "statusCode": 200,
  "uri": "/customer/cart",
  "response": {
    "id": "foo"
  }
}
```

The `uri` property defines the URI that is being mocked in your application
and can contain a regex:

```
"uri": "/customer/\\d*/cart"
```

### Delayed responses

In some scenarios you may want to simulate a server/network delay.
This is done by intercepting the HTTP response and delaying it.
Mocks accept an optional `responseDelay` property that will delay
the HTTP response for the specified time in milliseconds:

```
"responseDelay": 500
```

The manifest file `mockResources.json` defines the available scenarios and
describes which version of each resource should be used for each scenario.

```json
{
  "_default": [
    "root/_default.json",
    "account/anonymous.json",
    "orders/_default.json"
  ],
  "loggedIn": [
    "account/loggedIn.json"
  ]
}
```

All scenarios inherit resources defined in `_default` unless they provide an
override. Think of `_default` as the base class for scenarios.

The example above defines 2 scenarios `_default` and `loggedIn`. `loggedIn` has
the default versions of the `root` and `orders` resources, but overrides
`account`, using the version in `account/loggedIn.json`.

#### Global delay override

You can override all delays in a request by adding an optional parameter to
the query string.

```
global_delay=0
```

Grunt Task
----------

Angular Multimocks defines a Grunt task called `multimocks`, which will compile
resources into an AngularJS module definition. Add the Grunt task to your build
and make the module a depedency in your app to enable scenarios.

Install the module using npm:

```sh
npm install --save-dev angular-multimocks
```

Add it to your Grunt configuration:

```javascript
// load the task
grunt.loadNpmTasks('angular-multimocks');

// configuration for scenarios
grunt.initConfig({
  multimocks: {
    myApp: {
      src: 'mocks',
      dest: 'build/multimocks.js',
      template: 'myTemplate.tpl' // optional
    }
  },
  // other config here...
});
```

Once the task is run, `build/multimocks.js` will be generated containing all your
mock data. Include that in your app:

```html
<script src="build/multimocks.js"></script>
```

### Output Scenarios In Multiple Files

If the generated `build/multimocks.js` is too large, you may experience memory
issues when running your application.

You can choose to build multiple files, one for each scenario by specifying
`multipleFiles: true` and `dest` as a directory.

Your Grunt configuration should look something like:

```javascript
// load the task
grunt.loadNpmTasks('angular-multimocks');

// configuration for scenarios
multimocks: {
  myApp: {
    src: 'mocks',
    dest: 'build/multimocks',
    multipleFiles: true,
    template: 'myTemplate.tpl' // optional
  }
},
```

When the task is run a file will be generated for each scenario. Include all
the generated files in your app:

```html
<script src="build/scenarios/_default.js"></script>
<script src="build/scenarios/foo.js"></script>
<script src="build/scenarios/bar.js"></script>
```

HAL Plugin
----------

If your API conforms to [HAL](http://stateless.co/hal_specification.html),
Angular Multimocks can generate links for you to speed development.

Enable the plugin in your `Gruntfile.js`:

```javascript
multimocks: {
  myApp: {
    src: 'mocks',
    dest: 'build/multimocks',
    plugins: ['hal']
  }
}
```

Organise your mock response files into a file structure with a directory for
each resource, e.g.:

```
.
├── account
│   ├── loggedIn.json
│   └── anonymous.json
├── orders
│   └── _default.json
├── root
│   └── _default.json
└── mockResources.json
```

Angular Multimocks will add a `_links` object to each response with all the
known resources declared as available links:

```json
{
  "httpMethod": "GET",
  "statusCode": 200,
  "response": {
    "id": "foo",
    "_links": {
      "root": {
        "rel": "root",
        "method": "GET",
        "href": "http://example.com/"
      },
      "account": {
        "rel": "account",
        "method": "GET",
        "href": "http://example.com/account"
      },
      "orders": {
        "rel": "orders",
        "method": "GET",
        "href": "http://example.com/orders"
      }
    }
  }
}
```

A `uri` will be generated for each resource. This value is used for the `href`
field of each object in `_links`.

`multimocksDataProvider`
------------------------

Angular Multimocks also declares a provider, `multimocksDataProvider`, which
allows you to set mock data by passing an object to the `setMockData` method.

`multimocksDataProvider` also gives you the ability to overwrite the default
headers returned by Angular Multimocks. Below we're setting the headers to
specify that the content type is HAL JSON.

```
.config(['mutimocksDataProvider', function (multimocksDataProvider) {
  multimocksDataProvider.setHeaders({
    'Content-Type': 'application/hal+json'
  });
}]);
```

Contributing
------------

We :heart: pull requests!

To contribute:

- Fork the repo
- Run `npm install`
- Run `grunt workflow:dev` to watch for changes, lint, build and run tests as
  you're working
- Write your unit tests for your change
- Test with the demo app
- Run `grunt package` to update the distribution files
