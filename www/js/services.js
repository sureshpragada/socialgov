angular.module('starter.services', [])

.factory('RegionService', ['$http', function($http) {
  return {
    all: function(callback) {
      $http.get("js/region.json").success(callback);
    },
    get: function(regionList, regionUniqueName) {
      for(var i=0;i<regionList.length;i++) {
        if(regionList[i].uniqueName==regionUniqueName) {
          return regionList[i];
        }
      }
      return null;
    }
  };
}]);
