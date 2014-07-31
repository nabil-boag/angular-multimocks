/* global angular */
/* jshint ignore:start */

angular
  .module('scenario')

  .config(['scenarioMockDataProvider', function (scenarioMockDataProvider) {
    scenarioMockDataProvider.setDefaultScenario('_default');
    scenarioMockDataProvider.setMockData(<%= scenarioData %>);
  }]);
/* jshint ignore:end */
