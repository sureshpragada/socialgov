angular.module('starter.directives', [])

.directive('myAppMessage', function() {
  return {
    restrict: 'E',
    scope: {
      appMessage: '=info'
    },  
    templateUrl: 'templates/directives/my-app-message-directive.html'
  };
});