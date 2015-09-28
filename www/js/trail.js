

.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region={};
  RegionService.getRegion(residency).then(function(region) {
    $scope.$apply(function(){
      console.log("Retrieved region from service " + JSON.stringify(region));
      $scope.region=region;
    });
  }, function(error) {
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.canManageRegionDetails=function(){
    return RegionService.canManageRegionDetails();
  };

})


.factory('RegionService', ['CacheFactory', '$q', function(CacheFactory, $q) {
  var regionCache;
  if (!CacheFactory.get('regionCache')) {
    regionCache = CacheFactory('regionCache', {
      maxAge: 10 * 60 * 1000,
      deleteOnExpire: 'passive'
    });
  }

  return {
    // TODO :: Remove this function once cache is working by using region service in account controller
    getFormattedRegionNameFromUniqueName: function(residency) {
      return residency[0].toUpperCase()+residency.substring(1);
    },

    getRegion: function(regionUniqueName) {
      var deferred = $q.defer();
      if(regionCache.get(regionUniqueName)) {
        console.log("Found hit");
        deferred.resolve(regionCache.get(regionUniqueName));
      } else {
        console.log("No hit");
        var Region = Parse.Object.extend("Region");
        var query = new Parse.Query(Region);
        query.equalTo("uniqueName", regionUniqueName);
        return query.find({      
          success: function(regions) {
            console.log("Retrieved from parse");
            regionCache.put(regionUniqueName, regions[0]);          
            deferred.resolve(regionCache.get(regionUniqueName));
          }, 
          error: function(error) {
            console.log("Error from parse");
            deferred.reject(error)
          }
        });        
      }
      console.log("Returning promise");
      return deferred.promise();
    },

    canManageRegionDetails: function(){
      var user=Parse.User.current();
      if(user.get("role")=="JNLST" || user.get("role")=="SUADM"){
        return true;
      }else{
        return false;
      }
    }
  };
}])