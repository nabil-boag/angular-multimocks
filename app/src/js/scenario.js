/* global getParameterByName, angular, _, console, setTimeout, location, window
 */
angular.module('scenario', ['ui.router'])

  .config(['$stateProvider', function config($stateProvider) {
    $stateProvider.state('scenario', {
        url: '/scenario/:state/:mock',
        controller: 'ScenarioController'
      });
  }])

  .controller('ScenarioController', [
    'scenarioMocks',
    '$state',
    '$stateParams',
    function (scenarioMocks, $state, $stateParams) {
      if (!_.isUndefined($stateParams.mock)) {
        scenarioMocks.setup($stateParams.mock).then(
          function () {
            if (!_.isUndefined($stateParams.state)) {
              $state.transitionTo($stateParams.state);
            }
          });
      }
    }
  ])

  .provider('scenarioMockData', [function () {
      var mockData = {};
      var defaultScenario;
      this.setMockData = function (data) {
        mockData = data;
      };

      this.setDefaultScenario = function (scenario) {
        defaultScenario = scenario;
      };

      this.$get = function () {
        return {
          getMockData: function () {
            return mockData;
          },
          getDefaultScenario: function () {
            return defaultScenario;
          }
        };
      };
    }
  ])
  .run(function (scenarioMocks, scenarioMockData) {
    // Only set a default scenario if one is not about to be set manually.
    if (window.location.hash.indexOf('scenario') === -1) {
    }
    /* jshint ignore:start */
    var getParameterByName = function (name) {
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
          results = regex.exec(window.location.search);
      return results === null ? "" :
        decodeURIComponent(results[1].replace(/\+/g, " "));
    };
    /* jshint ignore:end */


    // Load a scenario based on URL string.
    // i.e. dev.ivy.com/?scenario=scenario1#/dashboard
    if (getParameterByName('scenario')) {
      scenarioMocks.setup(getParameterByName('scenario'));
    } else {
      scenarioMocks.setup(scenarioMockData.getDefaultScenario());
    }
  })

  .factory('scenarioMocks', [
    '$http',
    '$q',
    '$httpBackend',
    'scenarioMockData',
    function ($http, $q, $httpBackend, scenarioMockData) {

      var scenarioMocks = {

        setup : function (scenarioRequired) {
          var deferred = $q.defer();
          this.implementMocks(scenarioRequired, deferred);
          return deferred.promise;
        },

        implementMocks : function (scenarioRequired, deferred) {

          var mockData = scenarioMockData.getMockData();

          var waitForResponse = false;

          // Look for mocks for this scenario.
          var scenario = _.has(mockData, scenarioRequired) ?
            mockData[scenarioRequired] : null;

          // Mock Headers.
          var mockHeaders = {
            'Content-Type': 'application/vnd.wonga.rest+json; charset=utf-8'
          };

          // Mocks found for scenario in query string.
          if (scenario !== null) {
            console.log('Setting mocks for scenario: ' + scenarioRequired);

            // Set mock for each item.
            _.forOwn(scenario, function (mock, key, object) {
              // Check for conditional request data.
              var data = _.has(mock, 'requestData') ?
                mock.requestData : undefined;

              // Mock a polling resource.
              if (typeof mock.poll !== 'undefined' && mock.poll) {
                var pollCounter = 0;

                // Respond with a 204 which will then get polled until a 200 is
                // returned.
                $httpBackend.when(mock.httpMethod, mock.uri, data)
                  .respond(function () {
                    var pollCount = _.has(mock, 'pollCount') ?
                      mock.pollCount : 2;
                   // Call a certain amount of times to simulate polling.
                    if (pollCounter < pollCount) {
                      pollCounter++;
                      return [204, {}, mockHeaders];
                    }
                    return [200, mock.response, mockHeaders];
                  });
              } else {
                $httpBackend.when(mock.httpMethod, mock.uri, data)
                  .respond(mock.statusCode, mock.response, mockHeaders);
              }
              // Make this http request now if required.
              if (typeof mock.callInSetup !== 'undefined' && mock.callInSetup) {
                waitForResponse = true;
                $http({method: mock.httpMethod, url: mock.uri}).success(
                  function (response) {
                    deferred.resolve();
                  }
                );
              }
            });
          } else {
            console.log('Mocks not found for: ' + scenarioRequired);
          }
          if (!waitForResponse) {
            deferred.resolve();
          }
        }
      };
      return scenarioMocks;
    }
  ]);
