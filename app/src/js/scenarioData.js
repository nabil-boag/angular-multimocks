/* global angular */
angular.module('scenario').config(['$provide', 'scenarioMockDataProvider',
  function ($provide, scenarioMockDataProvider) {

    scenarioMockDataProvider.setDefaultScenario('scenario1');
    scenarioMockDataProvider.setMockData(
      {
        'scenario1':
          [
            {
              'uri': 'test.com/test',
              'httpMethod': 'GET',
              'statusCode': 200,
              'response': {
                'scenario': 'one',
              }

            }
          ],
          'scenario2':
          [
            {
              'uri': 'test.com/test',
              'httpMethod': 'GET',
             'statusCode': 200,
              'response': {
                'scenario': 'two',
              }
            }
          ]
        }
    );
  }]);
