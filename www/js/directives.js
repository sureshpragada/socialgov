angular.module('starter.directives', [])

.directive('myAppMessage', function() {
  return {
    restrict: 'E',
    scope: {
      appMessage: '=info'
    },  
    templateUrl: 'templates/directives/my-app-message-directive.html'
  };
})

.directive('resident', function() {
  return {
    restrict: 'E',
    scope: {
      resident: '=info'
    },  
    templateUrl: 'templates/directives/resident-directive.html'
  };
})

.directive('vehicle', function() {
  return {
    restrict: 'E',
    scope: {
      user: '=info'
    },  
    templateUrl: 'templates/directives/vehicle-directive.html'
  };
})

;