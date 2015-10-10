angular.module('starter.controllers')

.factory('PictureManagerService', ['$http', function($http) {
  var state={fromPage: "tab.post", imageUrl: null};
  return {
    setState: function(incomingState) {
      state=incomingState;
    },
    getState: function() {
      return state;
    },
    setImageUrl: function(imageUrl) {
      state.imageUrl=imageUrl;
    }
  };
}])

.controller('PictureManagerCtrl', function($scope, $state, $http, $cordovaCamera, PictureManagerService, LogService) {
  $scope.takePicture=function() {
    manageupload(Camera.PictureSourceType.CAMERA);
  };

  $scope.selectFromGallery=function() {
    manageupload(Camera.PictureSourceType.PHOTOLIBRARY);
  };

  function manageupload(sourceType){
      var options = { 
          quality : 75, 
          destinationType : Camera.DestinationType.DATA_URL, 
          sourceType : sourceType, 
          allowEdit : true,
          encodingType: Camera.EncodingType.file,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false
      };
      $cordovaCamera.getPicture(options).then(function(imageData) {
           $scope.file= "data:image/jpeg;base64," +imageData;
      }, function(error) {
          console.log("Error getting picture " + JSON.stringify(error));
      });  
  }

  $scope.uploadPicture=function() {
    console.log("Uploading picture");

    var file = $scope.file;
    /* Is the file an image? */
   if (!file ) return;

    if (!file || !file.type) 
            file = file.replace(/^data:image\/(png|jpeg);base64,/, "");

    $http({
      url: "https://api.imgur.com/3/image.json",
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        "Authorization": "Client-ID 7969d63af05026f"
      },
      data: file
    }).then(function(response) {
        // file is uploaded successfully
        console.log(response.data.data.link);
        PictureManagerService.setImageUrl(response.data.data.link);
        $scope.file="";
        $state.go("tab.post");    
      },function(error) {
         console.log("Error uploading image file: " + error);
    }); 

  };

  $scope.cancel=function() {
    $state.go("tab.post");
  };

});
