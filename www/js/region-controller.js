<<<<<<< HEAD
 angular.module('starter.test-controller', ['ngCordova', 'ionic'])
=======
angular.module('starter.controllers')
>>>>>>> sureshpragada/master

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

<<<<<<< HEAD
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
        $scope.newDemoObj.area=$scope.region.get('demography').area;
        $scope.newDemoObj.population=$scope.region.get('demography').population;
        $scope.newDemoObj.history=$scope.region.get('demography').history;
        $scope.newDemoObj.year=$scope.region.get('demography').est;
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
})
=======
.controller('ChangeDemoDetailsCtrl', function($scope, $state) {
  $scope.demoErrorMessage=null;
  $scope.checkboxFlag=true;
  $scope.newDemObj={};
  $scope.checkboxList = [
    { text: "Area", checked: false },
    { text: "population", checked: false },
    { text: "History", checked: false }
  ];

  $scope.ok=function(){
    $scope.checkboxFlag=false;
    if($scope.checkboxList[0].checked==false && $scope.checkboxList[1].checked==false &&$scope.checkboxList[2].checked==false)
      $scope.demoErrorMessage="No fileds selected!";
  };

  $scope.submit=function(){

  };

  $scope.cancel=function(){
    console.log("yes");
    $state.go("tab.changedemodetails");
  };
});
>>>>>>> sureshpragada/master
