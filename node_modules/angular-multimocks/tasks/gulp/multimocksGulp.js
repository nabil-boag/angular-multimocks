/* global require, module */

var gutil = require('gulp-util'),
  MultimocksGenerator = require('../multimocksGenerator.js');

module.exports = function (config) {

  var logger = function (message, content) {
    if (config.verbose) {
      gutil.log(message, content);
    }
  };

  var multimocksGenerator = new MultimocksGenerator(logger, config);

  multimocksGenerator.writeScenarioData();
};
