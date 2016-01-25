/* global require, module, process */

module.exports = function (grunt) {
  var _ = require('lodash'),
    path = require('path'),
    fs = require('fs');

  var pluginRegistry = require('./plugins');

  var pwd = path.dirname(module.filename),
    singleFileDefaultTemplate = path.join(pwd, 'multimocks.tpl'),
    multipleFilesDefaultTemplate = path.join(pwd,
        'multimocksMultipleFiles.tpl'),
    mockManifestFilename = 'mockResources.json';

  /**
   * Merge 2 scenarios together.
   */
  var mergeScenarios = function (parentScenario, childScenario) {
    var all = childScenario.concat(parentScenario);

    // remove parent scenario resource which provides the same
    // resource as child scenario
    return _.uniq(all, function (resource) {
      return resource.uri + resource.httpMethod;
    });
  };

  /**
   * Read a scenario from a list of resource files, add URIs and merge in
   * resources from default scenario.
   */
  var readScenario = function (config, mockSrc, defaultScenario, filenames,
      scenarioName) {
    // read mock data files for this scenario
    var scenario = filenames.map(function (filename) {
      var filepath = fs.realpathSync(path.join(mockSrc, filename));

      return {
        scenarioName: scenarioName,
        filename: filename,
        scenario: require(filepath)
      };
    });

    // if not default scenario, merge in default resources
    if (scenarioName === '_default') {
      return scenario;
    }

    return mergeScenarios(defaultScenario, scenario);
  };

  /**
   * Read scenario definitions and return a structure that
   * multimockDataProvider.setMockData will understand.
   */
  var readMockManifest = function (config, mockSrc) {
    var mockManifestPath = path.join(process.cwd(), mockSrc,
      mockManifestFilename),

      // read manifest JSON by require'ing it
      mockManifest = require(mockManifestPath),

      // read files for default scenario first, so we can merge it into other
      // scenarios later
      defaultScenario = readScenario(config, mockSrc, [],
        mockManifest._default, '_default');

    // read files for each scenario
    return _.mapValues(mockManifest, function (filenames, scenarioName) {
      return readScenario(config, mockSrc, defaultScenario, filenames,
        scenarioName);
    });
  };

  /**
   * Executes each of the plugins configured in the application Gruntfile.js to
   * decorate responses.
   *
   * @param  {object} data
   * @param  {array} pluginNames
   * @return {object} decoratedData
   */
  var runPlugins = function (data, pluginNames) {
    grunt.verbose.writeln('runPlugins input', data);
    var plugins = pluginNames.map(function (pn) {
        return pluginRegistry[pn];
      }),
      applyPlugin = function (oldData, plugin) {
        return plugin(oldData);
      };

    // Use reduce to apply all the plugins to the data
    var output = plugins.reduce(applyPlugin, data);
    grunt.verbose.writeln('runPlugins output', output);
    return output;
  };

  /**
   * Strip context metadata from scenarios.
   */
  var removeContext = function (dataWithContext) {
    return _.mapValues(dataWithContext, function (scenario) {
      return scenario.map(function (response) {
        return response.scenario;
      });
    });
  };

  /**
   * Return a javascript object of all scenario data.
   *
   * @param {string} config
   * @param {string} mockSrc
   *
   * @returns {object}
   */
  var readScenarioData = function (config, mockSrc) {
    var dataWithContext = readMockManifest(config, mockSrc);

    grunt.verbose.writeln('readScenarioData config', config);
    if (config.plugins) {
      dataWithContext = runPlugins(dataWithContext, config.plugins);
    }

    return removeContext(dataWithContext);
  };

  /**
   * Saves the specified file to file system.
   *
   * @param {string} templatePath
   * @param {string} path
   * @param {string} data
   * @param {string} name
   */
  var writeScenarioModule = function (templatePath, path, data, name) {
    var templateString = fs.readFileSync(templatePath);

    // generate scenarioData.js contents by inserting data into template
    var templateData = {scenarioData: data};
    templateData.scenarioDataName = name || '';

    var output = _.template(templateString)(templateData);

    // write file
    fs.writeFileSync(path, output);
  };

  /**
   * Read mock manifest and JSON files and compile into JS files ready for
   * inclusion into an Angular app.
   */
  var writeScenarioData = function () {
    this.files.forEach(function (taskConfig) {
      taskConfig.multipleFiles = taskConfig.multipleFiles || false;

      var defaultTemplate = singleFileDefaultTemplate;
      if (taskConfig.multipleFiles) {
        defaultTemplate = multipleFilesDefaultTemplate;
      }
      taskConfig.template = taskConfig.template || defaultTemplate;

      var mockSrc = taskConfig.src[0];

      grunt.verbose.writeln('mockSrc', mockSrc);
      grunt.verbose.writeln('dest', taskConfig.dest);
      grunt.verbose.writeln('template', taskConfig.template);
      grunt.verbose.writeln('multipleFiles', taskConfig.multipleFiles);
      grunt.verbose.writeln('plugins', taskConfig.plugins);

      // read all scenario data from manifest/JSON files
      var scenarioData = readScenarioData(taskConfig, mockSrc);

      grunt.verbose.writeln('scenarioData', scenarioData);

      var scenarioModuleFilename = taskConfig.dest,
        scenarioString;

      if (!taskConfig.multipleFiles) {
        // stringify all scenario files into a single Angular module
        scenarioString = JSON.stringify(scenarioData);
        writeScenarioModule(taskConfig.template, scenarioModuleFilename,
          scenarioString);
      } else {
        fs.mkdirSync(taskConfig.dest);

        // stringify each scenario file into it's own Angular module
        for (var scenarioName in scenarioData) {
          if (scenarioData.hasOwnProperty(scenarioName)) {
            scenarioModuleFilename = taskConfig.dest + '/' + scenarioName +
              '.js';

            scenarioString = JSON.stringify(scenarioData[scenarioName]);
            writeScenarioModule(taskConfig.template, scenarioModuleFilename,
              scenarioString, scenarioName);
          }
        }
      }
    });
  };

  /**
   * Register Grunt task to compile mock resources into scenario data file.
   */
  grunt.registerMultiTask('multimocks',
      'Generate Angular Multimocks scenario module',
      writeScenarioData);
};
