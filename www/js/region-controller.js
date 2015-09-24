angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})

.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }

  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  query.equalTo("uniqueName", residency);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        //console.log("Region : " + JSON.stringify(regions));
        $scope.region=regions[0];
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });          

  $scope.isAdmin=function(){
    var user=Parse.User.current();
    if(user.get("role")=="ADMN" || user.get("role")=="SUADM"){
      return true;
    }else{
      return false;
    }
  };

})


.controller('ChangeDemoDetailsCtrl', function($scope, $state, $stateParams) {
  $scope.newDemoObj={}; 
  var residency=$stateParams.regionUniqueName;
  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  console.log($stateParams.regionUniqueName);
  query.equalTo("uniqueName", residency);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        //console.log("Region : " + JSON.stringify(regions));
        $scope.region=regions[0];
        $scope.newDemoObj=$scope.region.get('demography');
        console.log(JSON.stringify($scope.newDemoObj));
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.submit=function(){
    $scope.region.set("demography",$scope.newDemoObj);
    $scope.region.save(null, {
        success: function(accessRequest) {
          console.log(JSON.stringify(accessRequest));
        }
    });
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };

  $scope.cancel=function(){
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };
});
