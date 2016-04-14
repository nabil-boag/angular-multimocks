/* global require, module */
var _ = require('lodash'),
  MultimocksGenerator = require('./multimocksGenerator.js');

module.exports = function (grunt) {

  /**
   * Register Grunt task to compile mock resources into scenario data file.
   */
  grunt.registerMultiTask('multimocks',
    'Generate Angular Multimocks scenario module',
    function () {
      var config = _.first(this.files);

      var logger = function (message, content) {
        if (config.verbose) {
          grunt.log.writeln(message, content);
        }
      };
      var multimocksGenerator = new MultimocksGenerator(logger, config);

      multimocksGenerator.writeScenarioData();
    });
};
