/* global angular */

angular
  .module('scenario')

  .config(['multimocksDataProvider', function (multimocksDataProvider) {
    multimocksDataProvider.setDefaultScenario('_default');
    // jscs:disable
    /* jshint ignore:start */
    multimocksDataProvider.setMockData(<%= scenarioData %>);
    /* jshint ignore:end */
    // jscs:enable
  }]);
