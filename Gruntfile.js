/* globals module */

module.exports = function (grunt) {
  grunt.loadNpmTasks('angular-multimocks');

  grunt.config.init({
    multimocks: {
      demoApp: {
        src: 'mockData',
        dest: 'mockOutput.js',
        multipleFiles: false
      }
    }
  });

  grunt.registerTask('default', ['multimocks']);
};
