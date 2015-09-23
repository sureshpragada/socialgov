angular.module('starter.filters', [])
.filter('nl2br', function() {
  return function(input) {
	if (!input) return input;
	   return input.replace(/\n\r?/g, '<br/>');  	
  };
})