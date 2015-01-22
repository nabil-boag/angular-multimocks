/* global angular, _, console */

angular
  .module('scenario', ['ui.router'])

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
    function ($q, $http, $httpBackend, multimocksData) {
      var setupHttpBackendForMockResource = function (deferred, mock) {
        var mockHeaders = multimocksData.getHeaders();

        // Mock a polling resource.
        if (mock.poll) {
          var pollCounter = 0,
              pollCount = _.has(mock, 'pollCount') ? mock.pollCount : 2;

          // Respond with a 204 which will then get polled until a 200 is
          // returned.
          $httpBackend
            .when(mock.httpMethod, new Regex(mock.uri), mock.requestData)
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
            .when(mock.httpMethod, new Regex(mock.uri), mock.requestData)
            .respond(mock.statusCode, mock.response, mockHeaders);
        }

        // Make this http request now if required otherwise just resolve
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
          var deferred = $q.defer(),
            actualScenarioName = scenarioName ||
              multimocksData.getDefaultScenario(),
            mockData = multimocksData.getMockData();

          if (_.has(mockData, actualScenarioName)) {
            var scenario = mockData[actualScenarioName];

            // Set mock for each item.
            _.forOwn(scenario, function (mock) {
              setupHttpBackendForMockResource(deferred, mock);
            });
          }
          else if (scenarioName) {
            // only write to console if scenario actively specified
            console.log('Mocks not found for: ' + scenarioName);
          }

          return deferred.promise;
        }
      };
    }
  ])

  .config([
    '$stateProvider',
    function ($stateProvider) {
      $stateProvider.state('scenario', {
        url: '/scenario/:state/:mock',
        controller: 'scenarioController'
      });
    }
  ])

  .controller('scenarioController', [
    '$state',
    '$stateParams',
    'multimocks',
    function ($state, $stateParams, multimocks) {
      if (!_.isUndefined($stateParams.mock)) {
        multimocks.setup($stateParams.mock).then(function () {
          if (!_.isUndefined($stateParams.state)) {
            $state.transitionTo($stateParams.state);
          }
        });
      }
    }
  ])

  .factory('scenarioName', function () {
    return {
      extract: function (search) {
        if (search.indexOf('scenario') !== -1) {
          var scenarioParams = search
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
    };
  })

  .run([
    '$window',
    'multimocks',
    'scenarioName',
    function ($window, multimocks, scenarioName) {
      // load a scenario based on URL string,
      // e.g. http://example.com/?scenario=scenario1
      multimocks.setup(scenarioName.extract($window.location.search));
    }
  ]);
