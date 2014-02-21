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
   *
   * TODO remove duplicates
   */
  var mergeScenarios = function (s1, s2) {
    var all = s2.concat(s1);
    return _.uniq(all, function (resource) { return resource.rel; });
  };

  /**
   * Read a scenario from a list of resource files, add URIs and merge in
   * resources from default scenario.
   */
  var readScenario = function (baseURL, mockDir, defaultScenario, filenames,
      scenarioName) {
    var scenario = filenames.map(function (filename) {
      var filepath = path.join(mockDir, filename),
          resource = JSON.parse(fs.readFileSync(filepath));
      resource.rel = filename.split('/')[0];
      if (resource.rel === 'Root') {
        resource.uri = baseURL;
      }
      else {
        resource.uri = baseURL + resource.rel;
      }
      return resource;
    });

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
        mocks = require(mockManifest),
        defaultScenario = readScenario(baseURL, mockDir, [], mocks._default,
          '_default');

    return _.mapValues(mocks, function (filenames, scenarioName) {
      return readScenario(baseURL, mockDir, defaultScenario, filenames,
        scenarioName);
    });
  };

  /**
   * Generate a list of all available links in all scenarios.
   */
  var generateAvailableLinks = function (scenarioData) {
    var linkBatches = _.map(scenarioData, function (scenario) {
      return _.object(_.map(scenario, function (res) {
        return [
          res.rel,
          {
            rel: res.rel,
            href: res.uri,
            method: res.httpMethod
          }
        ];
      }));
    });
    return _.reduce(linkBatches, _.merge, {});
  };

  /**
   * Add response._links to all resources in a scenario.
   */
  var scenarioWithLinks = function (links, scenario) {
    return _.map(scenario, function (res) {
      var newRes = _.cloneDeep(res);
      if (newRes.response) {
        newRes.response._links = links;
      }
      return newRes;
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
  var generateScenarioData = function (baseURL, mockDir) {
    var data = readMockManifest(baseURL, mockDir),
        dataWithLinks = scenarioDataWithLinks(data);
    return JSON.stringify(dataWithLinks, null, '  ').replace(/\n/g, '\n    ');
  };

  var writeScenarioData = function () {
    this.files.forEach(function (f) {
      grunt.verbose.writeln('src: ' + f.src);
      grunt.verbose.writeln('dest: ' + f.dest);
      grunt.verbose.writeln('template: ' + f.template);
      grunt.verbose.writeln('baseURL: ' + f.baseURL);

      var mockDir = f.src[0], // TODO handle multiple dirs by merging manifests?
          templatePath = f.template || defaultTemplatePath,
          templateString = fs.readFileSync(templatePath),
          scenarioData = generateScenarioData(f.baseURL, mockDir),
          output = _.template(templateString, {scenarioData: scenarioData});
      fs.writeFileSync(f.dest, output);
    });
  };

  /**
   * Register Grunt task to compile mock resources into scenario data file.
   */
  grunt.registerMultiTask('scenarios', 'Generate scenario data file',
    writeScenarioData);
};
