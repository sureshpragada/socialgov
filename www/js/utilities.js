angular.module('utility.services', [])

.factory('UtilityService', ['$http', 'CacheFactory', function($http, CacheFactory) {

  return {
    generateRandomNumber: function(numberOfDigits) {
	    var base=Math.pow(10, numberOfDigits-1);
	    return Math.floor(base + Math.random() * (9*base));
    },
    generateHomeNumber: function(blockNo, unitNo) {
    	if(blockNo!=null && blockNo.trim().length>0) {
    		return "Block " + blockNo.toUpperCase() + ";Unit " + unitNo + ";";  
    	} else {
    		return unitNo;
    	}
    }
  };
}]);
