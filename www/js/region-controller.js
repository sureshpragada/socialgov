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