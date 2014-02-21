/* global angular */

angular
  .module('scenario')

  .config(['scenarioMockDataProvider', function (scenarioMockDataProvider) {
    scenarioMockDataProvider.setDefaultScenario('_default');
    scenarioMockDataProvider.setMockData(<%= scenarioData %>);
  }]);
