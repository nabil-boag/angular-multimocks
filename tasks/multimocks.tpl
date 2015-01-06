/* global angular */

angular
  .module('scenario')

  .config(['multimockDataProvider', function (multimockDataProvider) {
    multimockDataProvider.setDefaultScenario('_default');
    /* jshint ignore:start */
    multimockDataProvider.setMockData(<%= scenarioData %>);
    /* jshint ignore:end */
  }]);
