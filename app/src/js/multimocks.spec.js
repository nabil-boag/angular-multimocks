/* global describe, beforeEach, jasmine, module, inject, it, xit, expect */

describe('multimocks', function () {
  var mockHttpBackend, mockWindow, multimocksDataProvider, multimocksData,
    multimocks, scenarioName, scenario1, scenario2, pollScenario, scenarios;

  beforeEach(function () {
    scenario1 = [
      {
        'uri': 'http://example.com/test',
        'httpMethod': 'GET',
        'statusCode': 200,
        'response': {
          'scenario': 1,
        }
      }
    ];

    scenario2 = [
      {
        'uri': 'http://example.com/test',
        'httpMethod': 'GET',
        'statusCode': 200,
        'response': {
          'scenario': 1,
        }
      }
    ];

    pollScenario = [
      {
        'uri': 'http://example.com/test',
        'httpMethod': 'GET',
        'statusCode': 200,
        'poll': true,
        'pollCount': 3,
        'response': {
          'scenario': 'poll',
        }
      }
    ];

    scenarios = {
      scenario1: scenario1,
      scenario2: scenario2
    };

    mockHttpBackend = jasmine.createSpyObj('$httpBackend', [
      'when',
      'respond'
    ]);
    mockHttpBackend.when.andReturn(mockHttpBackend);

    mockWindow = {location: {search: ''}};
  });

  describe('scenarioName', function () {
    beforeEach(function () {
      module('scenario');
      inject(function (_scenarioName_) {
        scenarioName = _scenarioName_;
      });
    });

    it('should extract the scenario name from string similar to that ' +
       'available in window.location.search', function () {
      expect(scenarioName.extract('?scenario=foo')).toBe('foo');
    });

    it('should return undefined if no scenario name is available in the ' +
       'input string', function () {
      expect(scenarioName.extract('')).toBe(undefined);
      expect(scenarioName.extract('?other=stuff')).toBe(undefined);
    });
  });

  describe('multimocksDataProvider', function () {
    beforeEach(function () {
      module(
        'scenario',
        function ($provide, _multimocksDataProvider_) {
          $provide.value('$httpBackend', mockHttpBackend);
          multimocksDataProvider = _multimocksDataProvider_;
        }
      );

      inject(function (_multimocksData_, _multimocks_) {
        multimocksData = _multimocksData_;
        multimocks = _multimocks_;
      });
    });

    it('should allow a client app to set mock data', function () {
      // act
      multimocksDataProvider.setMockData(scenarios);

      // assert
      expect(multimocksData.getMockData()).toEqual(scenarios);
    });

    it('should allow a client app to incrementally add mock data', function () {
      // act
      multimocksDataProvider.addMockData('scenario1', scenario1);
      multimocksDataProvider.addMockData('scenario2', scenario2);

      // assert
      expect(multimocksData.getMockData()).toEqual(scenarios);
    });

    it('should load the default scenario if specified', function () {
      // arrange
      multimocksDataProvider.addMockData('_default', scenario2);

      // act
      multimocks.setup();

      // assert
      var mockResource = scenario2[0];
      expect(mockHttpBackend.when).toHaveBeenCalledWith(
        mockResource.httpMethod, mockResource.uri, mockResource.requestData);
      expect(mockHttpBackend.respond).toHaveBeenCalledWith(
        mockResource.statusCode, mockResource.response, jasmine.any(Object));
    });

    it('should allow a client app to set the default scenario', function () {
      // arrange
      var defaultScenario = 'foo';

      // act
      multimocksDataProvider.setDefaultScenario(defaultScenario);

      // assert
      expect(multimocksData.getDefaultScenario()).toEqual(defaultScenario);
    });
  });

  describe('setup', function () {
    var setupMultimocks = function (mockData) {
      mockWindow = {location: {search: '?scenario=scenario2'}};
      module(
        'scenario',
        function ($provide, _multimocksDataProvider_) {
          $provide.value('$httpBackend', mockHttpBackend);
          $provide.value('$window', mockWindow);
          multimocksDataProvider = _multimocksDataProvider_;
          multimocksDataProvider.setMockData(mockData);
        }
      );
      inject();
    };

    it('should load the scenario specified on the query string', function () {
      // arrange
      setupMultimocks(scenarios);

      // assert
      var mockResource = scenario2[0];
      expect(mockHttpBackend.when).toHaveBeenCalledWith(
        mockResource.httpMethod, mockResource.uri, mockResource.requestData);
      expect(mockHttpBackend.respond).toHaveBeenCalledWith(
        mockResource.statusCode, mockResource.response, jasmine.any(Object));
    });

    it('should do nothing if the specified scenario isn\'t found', function () {
      // arrange - inject empty mock data
      setupMultimocks({});

      // assert
      expect(mockHttpBackend.when).not.toHaveBeenCalled();
      expect(mockHttpBackend.respond).not.toHaveBeenCalled();
    });


    it('should register a function to generate responses for mocks with ' +
       'polling', function () {
      // arrange
      setupMultimocks({'scenario2': pollScenario});

      // assert
      var mockResource = scenario2[0];
      expect(mockHttpBackend.when).toHaveBeenCalledWith(
        mockResource.httpMethod, mockResource.uri, mockResource.requestData);
      expect(mockHttpBackend.respond)
        .toHaveBeenCalledWith(jasmine.any(Function));
    });
  });
});
