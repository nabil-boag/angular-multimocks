module.exports = function(grunt) {
  grunt.task.loadTasks('../tasks');

  grunt.config.init({
    multimocks: {
      demoApp: {
        src: 'mockData',
        dest: 'mockOutput.js',
        multipleFiles: false,
        baseURL: 'https://example.com/'
      }
    }
  });

  grunt.registerTask('default', ['multimocks']);
};