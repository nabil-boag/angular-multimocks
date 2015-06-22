/* global angular, exports, module */

(function (root, name, factory) {
  if (typeof angular === "object" && angular.module) {
    angular
      .module("scenario")
      .config([
        "multimocksDataProvider",
        function (multimocksDataProvider) {
          multimocksDataProvider.setDefaultScenario("_default");
          multimocksDataProvider.addMockData(name, factory());
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
