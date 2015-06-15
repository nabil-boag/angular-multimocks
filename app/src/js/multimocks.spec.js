/* global describe, beforeEach, jasmine, module, inject, it, expect */


describe('multimocks', function () {
  var mockHttpBackend, mockWindow, multimocksDataProvider, multimocksData,
    multimocks, scenario1, scenario2, pollScenario, delayedResponseScenario,
    scenarios, mockHeaders, mockUriRegExp, regexScenario;

  beforeEach(function () {
    scenario1 = [
      {
        uri: '/test',
        httpMethod: 'GET',
        statusCode: 200,
        response: {
          scenario: 1
        }
      }
    ];

    scenario2 = [
      {
        uri: '/test',
        httpMethod: 'GET',
        statusCode: 200,
        response: {
          scenario: 1
        }
      }
    ];

    regexScenario = [
      {
        uri: '/test/\\d*/foo',
        httpMethod: 'GET',
        statusCode: 200,
        responseDelay: 345,
        response: {
          scenario: 1
        }
      }
    ];

    pollScenario = [
      {
        uri: '/test',
        httpMethod: 'GET',
        statusCode: 200,
        poll: true,
        pollCount: 3,
        response: {
          scenario: 'poll'
        }
      }
    ];

    delayedResponseScenario = [
      {
        uri: '/delayed',
        httpMethod: 'GET',
        statusCode: 123,
        responseDelay: 9876,
        response: {
          data: 'poll'
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

    mockHeaders = {foo: 'bar'};

    mockUriRegExp = new RegExp('^/test$');
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

    it('should allow a client app to set response headers', function () {
      // act
      multimocksDataProvider.setHeaders(mockHeaders);

      // assert
      expect(multimocksData.getHeaders()).toEqual(mockHeaders);
    });

    it('should have json as the default content type', function () {
      // assert
      expect(multimocksData.getHeaders()).toEqual({
        'Content-type': 'application/json'
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
      multimocksDataProvider.setHeaders(mockHeaders);

      // act
      multimocks.setup('_default');

      // assert
      var mockResource = scenario2[0];
      expect(mockHttpBackend.when).toHaveBeenCalledWith(
        mockResource.httpMethod, mockUriRegExp, mockResource.requestData);
      expect(mockHttpBackend.respond).toHaveBeenCalledWith(
        mockResource.statusCode, mockResource.response, mockHeaders);
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
          multimocksDataProvider.setHeaders(mockHeaders);
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
        mockResource.httpMethod, mockUriRegExp, mockResource.requestData);
      expect(mockHttpBackend.respond).toHaveBeenCalledWith(
        mockResource.statusCode, mockResource.response, mockHeaders);
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
        mockResource.httpMethod, mockUriRegExp, mockResource.requestData);
      expect(mockHttpBackend.respond)
        .toHaveBeenCalledWith(jasmine.any(Function));
    });
  });

  describe('currentScenario', function () {
    var currentScenario,
      $window;

    beforeEach(module('scenario',
      function ($provide) {
        // Setup mocks
        $provide.value('$window', mockWindow);
      }));

    beforeEach(inject(function (_currentScenario_, _$window_) {
      currentScenario = _currentScenario_;
      $window = _$window_;
    }));

    describe('getName', function () {
      it('should return the scenario name if it is in the path', function () {
        // Arrange
        $window.location.search = '?scenario=foo';

        // Act - Assert
        expect(currentScenario.getName()).toBe('foo');
      });

      it('should return default if no scenario name is in the path',
        function () {
          // Arrange
          $window.location.search = '';

          // Act - Assert
          expect(currentScenario.getName()).toBe('_default');
        });

      it('should return default if other no scenario name is in the path, ' +
        'but other items are',
        function () {
          // Arrange
          $window.location.search = '?other=stuff';

          // Act - Assert
          expect(currentScenario.getName()).toBe('_default');
        });
    });
  });

  describe('scenarioMocks', function() {
    var scenarioMocks,
      currentScenario,
      $log;

    beforeEach(function() {
      module('scenario', function($provide) {
        $provide.value('multimocksData', {
          getMockData: jasmine.createSpy().andReturn(scenarios),
          getDefaultScenario: jasmine.createSpy(),
        });
        $provide.value('$log', {
          log: jasmine.createSpy()
        });
        $provide.value('currentScenario', {
          getName: jasmine.createSpy()
        });
        $provide.value('multimocks', {
          setup: jasmine.createSpy()
        });
      });

      inject(function (_scenarioMocks_, _$log_, _multimocksData_,
        _currentScenario_) {
        scenarioMocks = _scenarioMocks_;
        multimocksData = _multimocksData_;
        currentScenario = _currentScenario_;
        $log = _$log_;
      });
    });

    describe('getMocks', function() {
      it('should return mocks for a valid scenario', function () {
        // Act
        var mocks = scenarioMocks.getMocks('scenario1');

        // Assert
        expect(mocks).toBe(scenario1);
      });

      it('should return undefined for a scenario that doesn\'t exist',
        function () {
          // Act
          var mocks = scenarioMocks.getMocks('badScenario');

          // Assert
          expect(mocks).toBe(undefined);
        });

      it('should log when no mocks can be found for a specified scenario',
        function () {
          // Act
          var mocks = scenarioMocks.getMocks('notFoundScenario');

          // Assert
          expect($log.log).toHaveBeenCalledWith(
            'Mocks not found for scenario: notFoundScenario');
        });
    });

    describe('getMocksForCurrentScenario', function() {
      it('should get mocks for the current scenario', function () {
        // Arrange
        scenarioMocks.getMocks = jasmine.createSpy().andReturn({data: 'value'});
        currentScenario.getName.andReturn('scenario3');

        // Act
        var mocks = scenarioMocks.getMocksForCurrentScenario();

        // Assert
        expect(scenarioMocks.getMocks).toHaveBeenCalledWith('scenario3');
        expect(mocks).toEqual({data: 'value'});
      });
    });

    describe('getDelayForResponse', function() {
     it('should return 0 when a mock isn\'t set for a response', function () {
        // Arrange
        scenarioMocks.getMocksForCurrentScenario = jasmine.createSpy()
          .andReturn(scenario1);
        currentScenario.getName.andReturn('scenario3');
        var mockedResponse = {
          config: {
            method: 'UNKNOWN',
            url: '/different/path'
          }
        };

        // Act
        var delay = scenarioMocks.getDelayForResponse(mockedResponse);

        // Assert
        expect(delay).toEqual(0);
      });

      it('should return 0 when a mock without a delay is set for a response',
        function () {
          // Arrange
          scenarioMocks.getMocksForCurrentScenario = jasmine.createSpy()
            .andReturn(scenario1);
          currentScenario.getName.andReturn('scenario3');
          var mockedResponse = {
            config: {
              method: 'GET',
              url: '/test'
            }
          };

          // Act
          var delay = scenarioMocks.getDelayForResponse(mockedResponse);

          // Assert
          expect(delay).toEqual(0);
        });

      it('should return delay when a mock with a delay is set for a response',
        function () {
          // Arrange
          scenarioMocks.getMocksForCurrentScenario = jasmine.createSpy()
            .andReturn(delayedResponseScenario);
          currentScenario.getName.andReturn('delayedResponseScenario');
          var mockedResponse = {
            config: {
              method: 'GET',
              url: '/delayed'
            }
          };

          // Act
          var delay = scenarioMocks.getDelayForResponse(mockedResponse);

          // Assert
          expect(delay).toBe(9876);
        });

      it('should return delay for a mock that has a regex for URL',
        function () {
          // Arrange
          scenarioMocks.getMocksForCurrentScenario = jasmine.createSpy()
            .andReturn(regexScenario);
          currentScenario.getName.andReturn('regexScenario');
          var mockedResponse = {
            config: {
              method: 'GET',
              url: '/test/123/foo'
            }
          };

          // Act
          var delay = scenarioMocks.getDelayForResponse(mockedResponse);

          // Assert
          expect(delay).toBe(345);
        });
    });
  });

  describe('run', function(){
    var currentScenario;

    beforeEach(function() {
      module('scenario', function($provide) {
        $provide.value('multimocks', {
          setup: jasmine.createSpy()
        });

        $provide.value('currentScenario', {
          getName: jasmine.createSpy().andReturn('myScenarioName')
        });
      });

      inject(function (_multimocks_, _currentScenario_) {
        multimocks = _multimocks_;
        currentScenario = _currentScenario_;
      });
    });

    it('should set up mocks with the current scenario name', function () {
      // Assert
      expect(multimocks.setup).toHaveBeenCalledWith('myScenarioName');
    });
  });
});
