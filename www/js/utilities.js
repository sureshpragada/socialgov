angular.module('utility.services', [])

.factory('UtilityService', ['$http', 'CacheFactory', function($http, CacheFactory) {

  return {
    generateRandomNumber: function(numberOfDigits) {
	    var base=Math.pow(10, numberOfDigits-1);
	    return Math.floor(base + Math.random() * (9*base));
    }
  };
}]);
