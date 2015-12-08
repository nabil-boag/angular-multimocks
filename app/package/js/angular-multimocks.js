/* global angular */

angular
  .module('scenario', ['ngMockE2E', 'multimocks.responseDelay'])

  .provider('multimocksData', function () {
    var mockData = {},
      mockHeaders = {
        'Content-type': 'application/json'
      },
      defaultScenario = '_default';

    this.setHeaders = function (data) {
      mockHeaders = data;
    };

    this.setMockData = function (data) {
      mockData = data;
    };

    this.addMockData = function (name, data) {
      mockData[name] = data;
    };

    this.setDefaultScenario = function (scenario) {
      defaultScenario = scenario;
    };

    this.$get = function $get() {
      return {
        getMockData: function () {
          return mockData;
        },
        getDefaultScenario: function () {
          return defaultScenario;
        },
        getHeaders: function () {
          return mockHeaders;
        }
      };
    };
  })

  .factory('multimocks', [
    '$q',
    '$http',
    '$httpBackend',
    'multimocksData',
    'scenarioMocks',
    function ($q, $http, $httpBackend, multimocksData, scenarioMocks) {
      var setupHttpBackendForMockResource = function (deferred, mock) {
        var mockHeaders = multimocksData.getHeaders(),
          uriRegExp = new RegExp('^' + mock.uri + '$');

        // Mock a polling resource.
        if (mock.poll) {
          var pollCounter = 0,
              pollCount = mock.pollCount !== undefined ? mock.pollCount : 2;

          // Respond with a 204 which will then get polled until a 200 is
          // returned.
          $httpBackend
            .when(mock.httpMethod, uriRegExp, mock.requestData)
            .respond(function () {
              // Call a certain amount of times to simulate polling.
              if (pollCounter < pollCount) {
                pollCounter++;
                return [204, {}, mockHeaders];
              }
              return [200, mock.response, mockHeaders];
            });
        } else {
          $httpBackend
            .when(mock.httpMethod, uriRegExp, mock.requestData)
            .respond(mock.statusCode, mock.response, mockHeaders);
        }

        // Make this HTTP request now if required otherwise just resolve
        // TODO deprecated?
        if (mock.callInSetup) {
          var req = {method: mock.httpMethod, url: mock.uri};
          $http(req).success(function () {
            deferred.resolve();
          });
        } else {
          deferred.resolve();
        }
      };

      return {
        setup: function (scenarioName) {
          var deferred = $q.defer();

          // Set mock for each item.
          var mocks = scenarioMocks.getMocks(scenarioName);
          for (var i in mocks) {
            setupHttpBackendForMockResource(deferred, mocks[i]);
          }

          return deferred.promise;
        }
      };
    }
  ])

  .factory('currentScenario', [
    '$window',
    'multimocksData',
    function ($window, multimocksData) {

      function getScenarioFromPath (path) {
        if (path.indexOf('scenario') !== -1) {
          var scenarioParams = path
            .slice(1)
            .split('&')
            .map(function (s) { return s.split('='); })
            .filter(function (kv) { return kv[0] === 'scenario'; });
          return scenarioParams[0][1];
        } else {
          return undefined;
        }
      }

      return {
        getName: function () {
          var scenarioFromURL = getScenarioFromPath($window.location.search);
          if (scenarioFromURL === undefined) {
            return multimocksData.getDefaultScenario();
          }
          return scenarioFromURL;
        }
      };
    }
  ])

  .factory('scenarioMocks', [
    '$log',
    'multimocksData',
    'currentScenario',
    'multimocksLocation',
    function ($log, multimocksData, currentScenario, multimocksLocation) {
      var mockData = multimocksData.getMockData();

      function urlMatchesRegex(url, regex) {
        var pattern = new RegExp(regex);
        return pattern.test(url);
      }

      var scenarioMocks =  {
        getMocks: function (scenarioToLoad) {
          if (mockData[scenarioToLoad] !== undefined) {
            return mockData[scenarioToLoad];
          }

          if (scenarioToLoad) {
            $log.error('Mocks not found for scenario: ' + scenarioToLoad);
          }
        },
        getMocksForCurrentScenario: function () {
          return scenarioMocks.getMocks(currentScenario.getName());
        },
        getDelayForResponse: function (response) {
          var globalDelay = multimocksLocation
            .getQueryStringValuesByKey('global_delay');
          if (globalDelay !== undefined) {
            return parseInt(globalDelay[0]);
          }
          var availableMocks = scenarioMocks.getMocksForCurrentScenario();

          for (var i in availableMocks) {
            var mock = availableMocks[i];
            var sameURL = urlMatchesRegex(response.config.url, mock.uri);
            var sameMethod = (mock.httpMethod === response.config.method);
            if (sameMethod && sameURL) {
              return mock.responseDelay || 0;
            }
          }
          return 0;
        }
      };
      return scenarioMocks;
    }
  ])

  /**
   * Service to interact with the browser location
   */
  .service('multimocksLocation', [
    '$window',
    function ($window) {
      var multimocksLocation = {};

      /**
       * Returns an array of values for a specified query string parameter.
       *
       * Handles multivalued keys and encoded characters.
       *
       * Usage:
       *
       * If the URL is /?foo=bar
       *
       * multimocksLocation.getQueryStringValuesByKey('foo')
       *
       * Will return
       *
       * ['bar']
       *
       * @return Array
       *   An array of values for the specified key.
       */
      multimocksLocation.getQueryStringValuesByKey = function (key) {
        var queryDictionary = {};
        $window.location.search
          .substr(1)
          .split('&')
          .forEach(function (item) {
            var s = item.split('='),
              k = s[0],
              v = s[1] && decodeURIComponent(s[1]);

            if (queryDictionary[k ]) {
              queryDictionary[k].push(v);
            } else {
              queryDictionary[k] = [v];
            }
          });
        return queryDictionary[key];
      };

      return multimocksLocation;
    }])

  .run([
    'multimocks',
    'currentScenario',
    function (multimocks, currentScenario) {
      // load a scenario based on URL string,
      // e.g. http://example.com/?scenario=scenario1
      multimocks.setup(currentScenario.getName());
    }
  ]);

/* global angular */

angular
  .module('multimocks.responseDelay', [])

  .factory('responseDelay', [
    '$q',
    '$timeout',
    'scenarioMocks',
    function ($q, $timeout, scenarioMocks) {
      return {
        response: function (response) {
          var delayedResponse = $q.defer();

          $timeout(function () {
            delayedResponse.resolve(response);
          }, scenarioMocks.getDelayForResponse(response));

          return delayedResponse.promise;
        }
      };
    }
  ])

  .config([
    '$httpProvider',
    function ($httpProvider) {
      $httpProvider.interceptors.push('responseDelay');
    }
  ]);
