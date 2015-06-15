/* global angular */

angular
  .module('multimocks.responseDelay', ['ui.router', 'ngMockE2E'])

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
