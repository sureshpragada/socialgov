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

;