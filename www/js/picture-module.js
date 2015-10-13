angular.module('starter.controllers')

.factory('PictureManagerService', ['$http', function($http) {
  var state={fromPage: "tab.post", imageUrl: null, data: {}};
  return {
    setState: function(incomingState) {
      state=incomingState;
    },
    getState: function() {
      return state;
    },
    setImageUrl: function(imageUrl) {
      state.imageUrl=imageUrl;
    },
    setData: function(data) {
      state.data=data;
    },
    reset: function() {
      state={imageUrl: null, data: {}};
    }
  };
}])

.controller('PictureManagerCtrl', function($scope, $state, $http, $cordovaCamera, PictureManagerService, LogService, $ionicLoading, $cordovaDialogs) {
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
    var file = $scope.file;    
    if(!file) {
      $cordovaDialogs.alert('Select picture from gallery or use camera.', 'Select picture', 'OK');
    } else {
      $ionicLoading.show({
        template: "<ion-spinner></ion-spinner> Uploading picture "
      });

      if (!file || !file.type) {
        file = file.replace(/^data:image\/(png|jpeg);base64,/, "");
      }

      $http({
        url: "https://api.imgur.com/3/image.json",
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          "Authorization": "Client-ID 7969d63af05026f"
        },
        data: file
      }).then(function(response) {
          $ionicLoading.hide();        
          PictureManagerService.setImageUrl(response.data.data.link);
          $scope.file="";
          $state.go("tab.post");    
        },function(error) {
          console.log("Error uploading image file: " + error);          
          $ionicLoading.hide();
          $cordovaDialogs.alert('Unable to upload picture. Check your interenet and try again.', 'Upload failure', 'OK');
      }); 
    }
  };

  $scope.cancel=function() {
    $state.go("tab.post");
  };

});
