/* global angular */

angular
  .module('scenario')

  .config(['scenarioMockDataProvider', function (scenarioMockDataProvider) {
    scenarioMockDataProvider.setDefaultScenario('_default');
    /* jshint ignore:start */
    scenarioMockDataProvider.setMockData(<%= scenarioData %>);
    /* jshint ignore:end */
  }]);
