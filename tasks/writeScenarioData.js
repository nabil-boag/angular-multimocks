/* global require, module, process */

module.exports = function (grunt) {
  var _ = require('lodash'),
      path = require('path'),
      fs = require('fs');

  var pwd = path.dirname(module.filename),
      defaultTemplatePath = path.join(pwd, 'scenarioData.tpl'),
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
      var filepath = fs.realpathSync(path.join(mockDir, filename)),
          resource = require(filepath);

      // rel name is the directory name of the file
      resource.rel = filename.split('/')[0];

      // add URIs for resources
      if (resource.rel === 'Root') {
        resource.uri = baseURL;
      }
      else {
        resource.uri = baseURL + resource.rel;
      }
      return resource;
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
   * scenarioMockDataProvider.setMockData will understand.
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
    var allTheLinks = _.reduce(scenarioLinks, _.merge, {});
    return allTheLinks;
  };

  /**
   * Add response._links to all resources in a scenario.
   */
  var scenarioWithLinks = function (links, scenario) {
    return _.map(scenario, function (resource) {
      var resourceClone = _.cloneDeep(resource);
      if (resourceClone.response) {
        if (resourceClone.linksWhitelist) {
          links = _.pick(links, resourceClone.linksWhitelist);
        }
        resourceClone.response._links = links;
      }
      return resourceClone;
    });
  };

  /**
   * Add _links to resources in all scenarios.
   */
  var scenarioDataWithLinks = function (data) {
    var links = generateAvailableLinks(data);
    return _.mapValues(data, function (scenario) {
      return scenarioWithLinks(links, scenario);
    });
  };

  /**
   * Return JSON string of all scenario data.
   */
  var readScenarioData = function (baseURL, mockDir) {
    var data = readMockManifest(baseURL, mockDir),
        dataWithLinks = scenarioDataWithLinks(data);
    return JSON.stringify(dataWithLinks, null, '  ').replace(/\n/g, '\n    ');
  };

  /**
   * Read mock manifest and JSON files and compile into single scenarioData.js
   * file.
   */
  var writeScenarioData = function () {
    this.files.forEach(function (f) {
      grunt.verbose.writeln('src: ' + f.src);
      grunt.verbose.writeln('dest: ' + f.dest);
      grunt.verbose.writeln('template: ' + f.template);
      grunt.verbose.writeln('baseURL: ' + f.baseURL);

      var mockDir = f.src[0], // TODO handle multiple dirs by merging manifests?
          templatePath = f.template || defaultTemplatePath,
          templateString = fs.readFileSync(templatePath);

      // read mock manifest and load data for each scenario
      var scenarioData = readScenarioData(f.baseURL, mockDir);

      // generate scenarioData.js contents by inserting data into template
      var output = _.template(templateString, {scenarioData: scenarioData});

      // write scenarioData.js to file
      fs.writeFileSync(f.dest, output);
    });
  };

  /**
   * Register Grunt task to compile mock resources into scenario data file.
   */
  grunt.registerMultiTask('scenarios', 'Generate scenario data file',
    writeScenarioData);
};
