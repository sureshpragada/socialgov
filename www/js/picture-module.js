angular.module('starter.controllers')

.factory('PictureManagerService', ['$http', function($http) {
  var state={fromPage: "tab.post", imageUrl: null, data: {}, fromPagePathParamValue: null};
  return {
    setState: function(incomingState) {
      state=incomingState;
    },
    getState: function() {
      return state;
    },
    setFromPage: function(fromPage) {
      state.fromPage=fromPage;
    },
    setFromPagePathParamValue: function(fromPagePathParamValue) {
      state.fromPagePathParamValue=fromPagePathParamValue;
    },    
    setImageUrl: function(imageUrl) {
      state.imageUrl=imageUrl;
    },
    setData: function(data) {
      state.data=data;
    },
    reset: function() {
      state={fromPage: "tab.post", imageUrl: null, data: {}, fromPagePathParamValue: null};
    }
  };
}])

.controller('PictureManagerCtrl', function($scope, $state, $http, $cordovaCamera, PictureManagerService, LogService, $ionicLoading, $cordovaDialogs) {
  $scope.pictureSelected=false;    
   $scope.myImage= "";
    $scope.result={
      myCroppedImage: ""
    }           
    
    // $scope.myCroppedImage='';
    // $scope.result={
    //   myCroppedImage: ""
    // }
    // $scope.myCropped="Suresh";

    //     var handleFileSelect=function(evt) {
    //       var file=evt.currentTarget.files[0];
    //       var reader = new FileReader();
    //       reader.onload = function (evt) {
    //         $scope.pictureSelected=true;            
    //         $scope.$apply(function($scope){
    //           $scope.myImage=evt.target.result;
    //         });
    //       };
    //       reader.readAsDataURL(file);
    //     };
    //     angular.element(document.querySelector('#fileInput')).on('change',handleFileSelect);



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
          // allowEdit : true,
          // targetWidth: 300,
          // targetHeight: 225,
          encodingType: Camera.EncodingType.JPEG,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false
      };
      $cordovaCamera.getPicture(options).then(function(imageData) {
         $scope.pictureSelected=true;
         $scope.myImage= "data:image/jpeg;base64," +imageData;
      }, function(error) {
          console.log("Error getting picture " + JSON.stringify(error));
      });  
  }

  $scope.chooseAnotherPicture=function() {
    $scope.pictureSelected=false;
  };

  $scope.capture=function(imageData) {
    console.log("captured data : " + JSON.stringify(imageData));
  };

  $scope.uploadPicture=function() {    
    var file = $scope.result.myCroppedImage;    
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
          "Authorization": "Client-ID " + IMGUR_KEY
        },
        data: file
      }).then(function(response) {
          $ionicLoading.hide();        
          PictureManagerService.setImageUrl(response.data.data.link);
          console.log("Picture URL : " + response.data.data.link);
          $scope.file="";
          $state.go(PictureManagerService.getState().fromPage, PictureManagerService.getState().fromPagePathParamValue);
        },function(error) {
          console.log("Error uploading image file: " + JSON.stringify(error));          
          $ionicLoading.hide();
          $cordovaDialogs.alert('Unable to upload picture. Check your interenet and try again.', 'Upload failure', 'OK');
      }); 
    }
  };

  $scope.cancel=function() {
    $state.go(PictureManagerService.getState().fromPage, PictureManagerService.getState().fromPagePathParamValue);
  };

});
