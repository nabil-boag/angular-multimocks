/* global module */

// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    basePath: 'app/build',
    plugins: [
      'karma-ng-scenario',
      'karma-coverage',
      'karma-firefox-launcher',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    port: 9876,
    captureTimeout: 60000,

    frameworks: ['ng-scenario'],
    files: [
      '**/*.scenario.js'
    ],

    singleRun: true,
    browsers: [
      'Chrome',
      'Firefox'
    ]
  });
};
