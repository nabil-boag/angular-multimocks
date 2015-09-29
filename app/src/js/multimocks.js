/* global angular, _ */

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
              pollCount = _.has(mock, 'pollCount') ? mock.pollCount : 2;

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
          $http(req).success(function (response) {
            deferred.resolve();
          });
        }
        else {
          deferred.resolve();
        }
      };

      return {
        setup: function (scenarioName) {
          var deferred = $q.defer();

          // Set mock for each item.
          _.forOwn(scenarioMocks.getMocks(scenarioName),
            function (mock) {
              setupHttpBackendForMockResource(deferred, mock);
            }
          );

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
        }
        else {
          return undefined;
        }
      }

      return {
        getName: function() {
          var scenarioFromURL = getScenarioFromPath($window.location.search);
          if (_.isUndefined(scenarioFromURL)) {
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
    function ($log, multimocksData, currentScenario) {
      var mockData = multimocksData.getMockData();

      function urlMatchesRegex(url, regex){
        var pattern = new RegExp(regex);
        return pattern.test(url);
      }

      var scenarioMocks =  {
        getMocks: function (scenarioToLoad) {
          if (_.has(mockData, scenarioToLoad)) {
            return mockData[scenarioToLoad];
          }

          if (scenarioToLoad) {
            $log.log('Mocks not found for scenario: ' + scenarioToLoad);
          }
        },
        getMocksForCurrentScenario: function () {
          return scenarioMocks.getMocks(currentScenario.getName());
        },
        getDelayForResponse: function (response) {
          var availableMocks = scenarioMocks.getMocksForCurrentScenario();
          var matchedMockIndex = _.findIndex(availableMocks, function(mock) {
            var sameURL = urlMatchesRegex(response.config.url, mock.uri);
            var sameMethod = (mock.httpMethod === response.config.method);
            return sameMethod && sameURL;
          });
          if (matchedMockIndex < 0) {
            return 0;
          }
          return availableMocks[matchedMockIndex].responseDelay || 0;
        }
      };
      return scenarioMocks;
    }
  ])

  .run([
    'multimocks',
    'currentScenario',
    function (multimocks, currentScenario) {
      // load a scenario based on URL string,
      // e.g. http://example.com/?scenario=scenario1
      multimocks.setup(currentScenario.getName());
    }
  ]);
