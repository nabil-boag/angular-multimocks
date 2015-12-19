/* global module, require */

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-karma');

  var os = require('os');

  grunt.registerTask('build', [
    'jshint',
    'jscs',
    'clean:build',
    'copy:build'
  ]);
  grunt.registerTask('test', [
    'karma:headless_unit'
  ]);
  grunt.registerTask('test:browser', [
    'karma:browser_unit'
  ]);
  grunt.registerTask('test:debug', [
    'karma:browser_unit_debug'
  ]);
  grunt.registerTask('package', [
    'clean:package',
    'concat:package',
    'uglify:package'
  ]);
  grunt.registerTask('workflow:dev', [
    'connect:dev',
    'build',
    'open:dev',
    'watch:dev'
  ]);

  grunt.initConfig({
    app: {
      name: 'angular-multimocks',
      source_dir: 'app/src',
      build_dir: 'app/build',
      package_dir: 'app/package',
      connect_port: grunt.option('connect_port') || 2302,
      hostname: os.hostname()
    },

    clean: {
      build: '<%= app.build_dir %>',
      package: '<%= app.package_dir %>'
    },

    jshint: {
      source: [
        '*.js',
        '<%= app.source_dir %>/**/*.js',
        '!<%= app.source_dir %>/node_modules/**/*.js',
        'tasks/*.js',
        'tasks/**/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    jscs: {
      source: [
        '*.js',
        '<%= app.source_dir %>/**/*.js',
        '!<%= app.source_dir %>/node_modules/**/*.js',
        'tasks/*.js',
        'tasks/**/*.js'
      ],
      options: {
        config: '.jscsrc'
      }
    },

    copy: {
      build: {
        files: [
          {
            expand: true,
            cwd: '<%= app.source_dir %>',
            src: ['**', '!css/**'],
            dest: '<%= app.build_dir %>'
          },
          {
            expand: true,
            cwd: 'node_modules',
            src: [
              'angular/angular.js',
              'angular-mocks/angular-mocks.js'
            ],
            dest: '<%= app.build_dir %>/node_modules'
          },
          {
            expand: true,
            src: ['package.json'],
            dest: '<%= app.build_dir %>'
          }
        ]
      }
    },

    karma: {
      headless_unit: {
        options: {
          configFile: 'karma-unit.conf.js',
          browsers: ['PhantomJS']
        }
      },
      browser_unit: {
        options: {
          configFile: 'karma-unit.conf.js'
        }
      },
      browser_unit_debug: {
        options: {
          configFile: 'karma-unit.conf.js',
          singleRun: false,
          browsers: ['Chrome']
        }
      }
    },

    concat: {
      package: {
        src: [
          '<%= app.build_dir %>/js/**/*.js',
          '!<%= app.build_dir %>/js/**/*.spec.js'
        ],
        dest: '<%= app.package_dir %>/js/<%= app.name %>.js'
      }
    },

    uglify: {
      package: {
        files: {
          '<%= app.package_dir %>/js/<%= app.name %>.min.js': [
            '<%= app.package_dir %>/js/<%= app.name %>.js'
          ]
        }
      }
    },

    connect: {
      options: {
        hostname: '*'
      },
      dev: {
        options: {
          port: '<%= app.connect_port %>',
          base: '<%= app.build_dir %>'
        }
      }
    },

    open: {
      dev: {
        url: 'http://<%= app.hostname %>:<%= app.connect_port %>/demo'
      }
    },

    watch: {
      dev: {
        files: ['<%= app.source_dir %>/**/*'],
        tasks: ['build', 'test:unit'],
        options: {
          livereload: true
        }
      }
    }
  });
};
