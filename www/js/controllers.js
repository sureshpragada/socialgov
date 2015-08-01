angular.module('starter.controllers', [])

.controller('ActivityCtrl', function($scope, $http) {
  $http.get("js/activity.json").success(function(data) {
    $scope.activities=data;
  });
})

.controller('PostActivityCtrl', function($scope, $http, $location) {
  
  $scope.post={"firstName":"", "lastName":"", "message": "", "type":"announcement", "region":"Dowlaiswaram"};

  $scope.submitPost=function() {
    var post=$scope.post;
    alert(post.firstName + post.lastName + post.message + post.type + post.region);
    $location.path("/tab/dash");
  };

})

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})

.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService) {
  RegionService.all(function(data) {
    $scope.region=RegionService.get(data, $stateParams.regionUniqueName);
  });
})

.controller('AccountCtrl', function($scope) {
  $scope.user={
    firstName: 'Suresh', 
    lastName: 'Pragada', 
    phoneNo: '4088324304', 
    residency: {name: 'Dowlaiswaram', uniqueName: 'dowlaiswaram'},
    settings: {
      notifications: true
    }
  };
});
