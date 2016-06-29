/* globals module */

module.exports = function (grunt) {
  // Normally you'd load angular-multimocks from NPM:
  //
  //   grunt.loadNpmTasks('angular-multimocks');
  //
  grunt.task.loadTasks('../../../tasks');

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
