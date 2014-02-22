/* global angular */

angular
  .module('scenarios')

  .config(['scenarioMockDataProvider', function (scenarioMockDataProvider) {
    scenarioMockDataProvider.setDefaultScenario('_default');
    scenarioMockDataProvider.setMockData(<%= scenarioData %>);
  }]);
