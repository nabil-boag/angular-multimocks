Angular Multimocks
==================

[![Build Status](https://travis-ci.org/wongatech/angular-multimocks.svg?branch=master)](https://travis-ci.org/wongatech/angular-multimocks)

Angular Multimocks lets you test how your app behaves with different responses
from an API.

Angular Multimocks allows you to define sets of mock API responses for different
scenarios as JSON files. A developer of an e-commerce app could set up scenarios
for a new customer, one who is registered and one who has an order outstanding.

Angular Multimocks allows you to switch between scenarios using a query string
parameter: `?scenario=foo`.

You can use Angular Multimocks to quickly test your app works in all situations
while developing or to provide mock data for a suite of automated acceptance
tests.

Example Use Case
----------------
You have an application which calls to `http://example.com/customer/123/basket`
to get a list of items in the customers basket. You'd like to be able to easily
switch between different responses from the endpoint so that you can test
the various use cases. You may want responses for the following:
- An empty basket
- A basket with a quick buy option
- A basket with out of stock items

Angular Multimocks lets you easily configure responses for each scenario without
you having to programatically interact with $http.


Usage
-----

Add Angular Multimocks to your project with Bower:

```sh
bower install --save angular-multimocks
```

Include `angular-multimocks.js` or `angular-multimocks.min.js` in your
application:

```html
<script src="bower_components/angular-multimocks/js/angular-multimocks.min.js"></script>
```

Mock Format
-----------

Mocks are organised into directories representing the available resources and
files for various versions of the response.

```
.
├── Account
│   ├── loggedIn.json
│   └── anonymous.json
├── Orders
│   └── _default.json
├── Root
│   └── _default.json
└── mockResources.json
```

A resource file might look like this:

```json
{
  "httpMethod": "GET",
  "statusCode": 200,
  "response": {
    "id": "foo"
  }
}
```

The manifest file `mockResources.json` defines the available scenarios and
describes which version of each resource should be used for each scenario.

```json
{
  "_default": [
    "Root/_default.json",
    "Account/anonymous.json",
    "Orders/_default.json"
  ],
  "loggedIn": [
    "Account/loggedIn.json"
  ]
}
```

All scenarios inherit resources defined in `_default` unless they provide an
override. Think of `_default` as the base class for scenarios.

The example above defines 2 scenarios `_default` and `loggedIn`. `loggedIn` has
the default versions of the `Root` and `Orders` resources, but overrides
`Account`, using the version in `Account/loggedIn.json`.

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
multimocks: {
  myApp: {
    src: 'mocks',
    dest: 'build/multimocks.js',
    baseURL: 'http://api.example.com/',
    template: 'myTemplate.tpl' // optional
  }
},
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
    baseURL: 'http://api.example.com/',
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

`multimocksDataProvider`
--------------------------

Angular Multimocks also declares a provider, `multimocksDataProvider`, which
allows you to set mock data by passing an object to the `setMockData` method.
