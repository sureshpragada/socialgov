angular.module('starter.controllers')

.factory('PictureManagerService', ['$http', function($http) {
  var state={fromPage: "tab.post", imageUrl: "http://placehold.it/300x300"};
  return {
    setState: function(incomingState) {
      state=incomingState;
    },
    getState: function() {
      return state;
    }
  };
}])

.controller('PictureManagerCtrl', function($scope, $state, $http, PictureManagerService) {

  var state=PictureManagerService.getState();
  $scope.imageUrl=state.imageUrl;

  $scope.takePicture=function() {
    console.log("Taking a picture");
  };

  $scope.selectFromGallery=function() {
    console.log("Selected from gallery");
  };

  $scope.uploadPicture=function() {
    console.log("Uploading picture");
    // TODO :: Set image url
    // TODO :: Determine from service initated page and transition there
    $state.go("tab.post");    
  };

  $scope.cancel=function() {
    // Determine from service initated page and transition there
    $state.go("tab.post");
  };

});
