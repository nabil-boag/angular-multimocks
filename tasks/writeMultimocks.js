/* global require, module, process */

module.exports = function (grunt) {
  var _ = require('lodash'),
    path = require('path'),
    fs = require('fs');

  var pwd = path.dirname(module.filename),
    defaultTemplatePath = path.join(pwd, 'multimocks.tpl'),
    multipleFilesTemplatePath = path.join(pwd, 'multimocksMultipleFiles.tpl'),
    mockManifestFilename = 'mockResources.json';

  /**
   * Merge 2 scenarios together.
   */
  var mergeScenarios = function (parentScenario, childScenario) {
    var all = childScenario.concat(parentScenario);

    // remove parent scenario resource which provide same resource as child
    // scenario
    return _.uniq(all, function (resource) {
      return resource.rel + resource.httpMethod;
    });
  };

  /**
   * Read a scenario from a list of resource files, add URIs and merge in
   * resources from default scenario.
   */
  var readScenario = function (baseURL, mockDir, defaultScenario, filenames,
      scenarioName) {
    // read mock data files for this scenario
    var scenario = filenames.map(function (filename) {
      var filepath = fs.realpathSync(path.join(mockDir, filename));

      return require(filepath);
    });

    // if not default scenario, merge in default resources
    if (scenarioName === '_default') {
      return scenario;
    }
    else {
      return mergeScenarios(defaultScenario, scenario);
    }
  };

  /**
   * Read scenario definitions and return a structure that
   * multimockDataProvider.setMockData will understand.
   */
  var readMockManifest = function (baseURL, mockDir) {
    var mockManifest = path.join(process.cwd(), mockDir, mockManifestFilename),

    // read manifest JSON by require'ing it
      mocks = require(mockManifest),

    // read files for default scenario first, so we can merge it into other
    // scenarios later
      defaultScenario = readScenario(baseURL, mockDir, [], mocks._default,
        '_default');

    // read files for each scenario
    return _.mapValues(mocks, function (filenames, scenarioName) {
      return readScenario(baseURL, mockDir, defaultScenario, filenames,
        scenarioName);
    });
  };

  /**
   * Generate a list of all available links in all scenarios.
   */
  var generateAvailableLinks = function (scenarioData) {
    var scenarioLinks = _.map(scenarioData, function (scenario) {
      return _.object(_.map(scenario, function (resource) {
        // return key-value array for _.object
        return [
          resource.rel,
          {
            rel: resource.rel,
            href: resource.uri,
            method: resource.httpMethod
          }
        ];
      }));
    });
    return _.reduce(scenarioLinks, _.merge, {});
  };

  /**
   * Add response._links to all resources in a scenario.
   */
  var scenarioWithLinks = function (links, scenario) {
    return _.map(scenario, function (resource) {
      var resourceClone = _.cloneDeep(resource);
      if (resourceClone.response) {
        if (resourceClone.relNames) {
          resourceClone.response._links = _.pick(links, resourceClone.relNames);
        }
        else {
          resourceClone.response._links = links;
        }
      }
      return resourceClone;
    });
  };

  /**
   * Add _links to resources in all scenarios.
   */
  var decorateWithHalLinks = function (data, fileConfig) {
    var links = generateAvailableLinks(data);
    return _.mapValues(data, function (scenario) {
      return addHalUris(scenarioWithLinks(links, scenario), fileConfig);
    });
  };

  var addHalUris = function (data, fileConfig) {
    // rel name is the directory name of the file
    resource.rel = filename.split('/')[0];

    // add URIs for resources
    if (resource.rel === 'Root') {
      resource.uri = fileConfig.baseURL;
    }
    else {
      resource.uri = fileConfig.baseURL + resource.rel;
    }

    return resource;
  };

  /**
   * Return JSON string of all scenario data.
   *
   * @param {string} baseURL
   * @param {string} mockDir
   *
   * @returns {string}
   */
  var readScenarioData = function (baseURL, mockDir, plugins, fileConfig) {
    return JSON.stringify(readScenarioDataAsObject(baseURL, mockDir, plugins,
      fileConfig));
  };

  /**
   * Return a javascript object of all scenario data.
   *
   * @param {string} baseURL
   * @param {string} mockDir
   *
   * @returns {object}
   */
  var readScenarioDataAsObject = function (baseURL, mockDir, plugins,
      fileConfig) {
    var data = readMockManifest(baseURL, mockDir);

    if (plugins) {
      return runPlugins(data, plugins, fileConfig);
    }
    else {
      return data;
    }
  };

  /**
   * Executes the plugins declared in Gruntfile.js to decorate responses.
   *
   * @param  {object} data
   * @param  {array} plugins
   * @return {object} decoratedData
   */
  var runPlugins = function (data, plugins, fileConfig) {

    var pluginRegistry = {
      'hal': decorateWithHalLinks
    };

    var decoratedData = data;

    for (var i = 0; i < plugins.length; i++) {
      var pluginFunc = pluginRegistry[plugins[i]];
      decoratedData = pluginFunc(decoratedData, fileConfig);
    };

    return decoratedData;
  }

  /**
   * Save the file
   *
   * @param {string} template
   * @param {string} path
   * @param {string} data
   * @param {string} name
   */
  var saveFile = function (template, path, data, name) {
    var templatePath = template || defaultTemplatePath,
      templateString = fs.readFileSync(templatePath);

    // generate scenarioData.js contents by inserting data into template
    var templateData = {scenarioData: data};
    templateData.scenarioDataName = name || '';

    var output = _.template(templateString, templateData);

    // write file
    fs.writeFileSync(path, output);
  };

  /**
   * Read mock manifest and JSON files and compile into JS files ready for
   * inclusion into an Angular app.
   */
  var writeScenarioData = function () {
    this.files.forEach(function (fileConfig) {
      fileConfig.multipleFiles = fileConfig.multipleFiles || false;

      grunt.verbose.writeln('src: ' + fileConfig.src);
      grunt.verbose.writeln('dest: ' + fileConfig.dest);
      grunt.verbose.writeln('template: ' + fileConfig.template);
      grunt.verbose.writeln('baseURL: ' + fileConfig.baseURL);
      grunt.verbose.writeln('plugins: ' + fileConfig.plugins);

      var mockDir = fileConfig.src[0],// TODO handle multiple dirs by merging manifests?
        scenarioData;

      if (!fileConfig.multipleFiles) {
        // read mock manifest and load data for each scenario
        scenarioData = readScenarioData(fileConfig.baseURL, mockDir,
          fileConfig.plugins, fileConfig);
        saveFile(fileConfig.template, fileConfig.dest, scenarioData);
      } else {
        var fileName;

        scenarioData = readScenarioDataAsObject(fileConfig.baseURL, mockDir, fileConfig.plugins, fileConfig);

        fs.mkdirSync(fileConfig.dest);

        for (var index in scenarioData) {
          if (scenarioData.hasOwnProperty(index)) {
            fileName = fileConfig.dest + '/' + index + '.js';

            saveFile(multipleFilesTemplatePath, fileName,
              JSON.stringify(scenarioData[index]), index);
          }
        }
      }
    });
  };

  /**
   * Register Grunt task to compile mock resources into scenario data file.
   */
  grunt.registerMultiTask('multimocks',
      'Generate Angular Multimocks scenario data file',
      writeScenarioData);
};
