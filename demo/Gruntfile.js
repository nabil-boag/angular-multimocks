module.exports = function(grunt) {
  grunt.task.loadTasks('../tasks');
  //Replace the above with this for your project
  //grunt.loadNpmTasks('angular-multimocks');

  grunt.config.init({
    multimocks: {
      demoApp: {
        src: 'mockData',
        dest: 'mockOutput.js',
        multipleFiles: false,

        //optionally load plugins
        //plugins: ['hal'],

        baseURL: 'https://example.com/'
      }
    }
  });

  grunt.registerTask('default', ['multimocks']);
};