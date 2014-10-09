/* global angular, exports, module */

(function (root, name, factory) {
  if (typeof angular === "object" && angular.module) {
    angular
      .module("scenario")
      .config([
        "scenarioMockDataProvider",
        function (scenarioMockDataProvider) {
          scenarioMockDataProvider.setDefaultScenario("_default");
          scenarioMockDataProvider.addMockData(name, factory());
        }
      ]);
  } else if (typeof exports === "object") {
    module.exports = factory();
  }
})(this, "<%= scenarioDataName %>", function () {
      /* jshint ignore:start */
      return <%= scenarioData %>;
      /* jshint ignore:end */
  }
);
