/* global module, require, console */

var _ = require('lodash');

/**
 * Generate a list of all available links in all scenarios.
 */
var generateAvailableLinks = function (scenarioData) {
  var scenarioLinks = _.map(scenarioData, function (scenario) {
    return _.object(_.map(scenario, function (resource) {
      // return key-value array for _.object
      resource.scenario.rel = resource.filename.split('/')[0];
      return [
        resource.scenario.rel,
        {
          rel: resource.scenario.rel,
          href: '/' + resource.scenario.rel,
          method: resource.scenario.httpMethod
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
    if (resourceClone.scenario.response) {
      if (resourceClone.scenario.relNames) {
        resourceClone.scenario.response._links = _.pick(links,
          resourceClone.scenario.relNames);
      }
      else {
        resourceClone.scenario.response._links = links;
      }
    }
    return resourceClone;
  });
};

/**
 * Generate dummy URIs for resources.
 */
var addHalUris = function (resource) {
  if (resource.scenario.rel === 'Root') {
    resource.scenario.uri = '/';
  }
  else {
    resource.scenario.uri = '/' + resource.scenario.rel;
  }
  return resource;
};

/**
 * Add _links to resources in all scenarios.
 */
var decorateWithHalLinks = function (data) {
  var links = generateAvailableLinks(data);
  return _.mapValues(data, function (scenario) {
    return scenarioWithLinks(links, scenario).map(function (resource) {
      return addHalUris(resource);
    });
  });
};

module.exports = decorateWithHalLinks;
