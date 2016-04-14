/* global require, module, process */

var _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  pluginRegistry = require('./plugins'),
  writefile = require('writefile');

var pwd = path.dirname(module.filename),
  singleFileDefaultTemplate = path.join(pwd, 'multimocks.tpl'),
  multipleFilesDefaultTemplate = path.join(pwd,
      'multimocksMultipleFiles.tpl'),
  mockManifestFilename = 'mockResources.json';

module.exports = function (logger, config) {

  /**
   * Merge 2 scenarios together.
   */
  var mergeScenarios = function (parentScenario, childScenario) {
    var all = childScenario.concat(parentScenario);

    // remove parent scenario resource which provide same resource as child
    // scenario
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
   * Executes each of the plugins configured in the application to
   * decorate responses.
   *
   * @param  {object} data
   * @param  {array} plugins
   * @return {object} decoratedData
   */
  var runPlugins = function (data, pluginNames) {
    logger('runPlugins input', data);
    var plugins = pluginNames.map(function (pn) { return pluginRegistry[pn]; }),
      applyPlugin = function (oldData, plugin) { return plugin(oldData); };
    // Use reduce to apply all the plugins to the data
    var output = plugins.reduce(applyPlugin, data);
    logger('runPlugins output', output);
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

    // log('readScenarioData config', config);
    if (config.plugins) {
      dataWithContext = runPlugins(dataWithContext, config.plugins);
    }

    return removeContext(dataWithContext);
  };

  /**
   * Save the file
   *
   * @param {string} template
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
    writefile(path, output);
  };

  /**
   * Read mock manifest and JSON files and compile into JS files ready for
   * inclusion into an Angular app.
   */
  var writeScenarioData = function () {
    config.multipleFiles = config.multipleFiles || false;

    var defaultTemplate = singleFileDefaultTemplate;
    if (config.multipleFiles) {
      defaultTemplate = multipleFilesDefaultTemplate;
    }
    config.template = config.template || defaultTemplate;

    var mockSrc = _.isArray(config.src) ? _.first(config.src) : config.src;
    logger('mock source', mockSrc);
    logger('dest', config.dest);
    logger('template', config.template);
    logger('multipleFiles', config.multipleFiles);
    logger('plugins', config.plugins);

    // read all scenario data from manifest/JSON files
    var scenarioData = readScenarioData(config, mockSrc);

    logger('scenarioData', scenarioData);

    var scenarioModuleFilename = config.dest,
      scenarioString;

    if (!config.multipleFiles) {
      // stringify all scenario files into a single Angular module
      scenarioString = JSON.stringify(scenarioData);
      writeScenarioModule(config.template, scenarioModuleFilename,
        scenarioString);
    } else {
      fs.mkdirSync(config.dest);

      // stringify each scenario file into it's own Angular module
      for (var scenarioName in scenarioData) {
        if (scenarioData.hasOwnProperty(scenarioName)) {
          scenarioModuleFilename = config.dest + '/' + scenarioName +
            '.js';

          scenarioString = JSON.stringify(scenarioData[scenarioName]);
          writeScenarioModule(config.template, scenarioModuleFilename,
            scenarioString, scenarioName);
        }
      }
    }
  };

  return {
    writeScenarioData: writeScenarioData
  };
};
