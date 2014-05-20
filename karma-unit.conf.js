/* global module */

// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    basePath: 'app/build',
    plugins: [
      'karma-jasmine',
      'karma-coverage',
      'karma-firefox-launcher',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    port: 9876,
    captureTimeout: 60000,

    frameworks: ['jasmine'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-ui-router/release/angular-ui-router.js',
      'bower_components/lodash/dist/lodash.js',
      'js/**/*.js'
    ],
    preprocessors: {
      '!(bower_components)/**/*.js': 'coverage'
    },

    /**
     * How to report, by default.
     */
    reporters: ['coverage', 'dots'],

    coverageReporter:  {
      type : 'html',
      dir : '../../coverage/'
    },

    singleRun: true,
    browsers: [
      'Chrome',
      'Firefox'
    ]
  });
};
