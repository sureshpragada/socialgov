angular.module('starter.controllers', [])

.controller('ActivityCtrl', function($scope, $http) {

  var user=Parse.User.current();

  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.equalTo("regionUniqueName", user.get("residency"));
  query.include("user");
  query.find({
    success: function(results) {
      $scope.activities=results;
    }, 
    error: function(error) {
      alert("Unable to get activities");
    }
  });
})

.controller('PostActivityCtrl', function($scope, $http, $location) {
  
  $scope.post={"activityType": "NOTF", "notifyMessage": "", "regionUniqueName":"dowlaiswaram"};

  $scope.submitPost=function() {
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();

      $scope.post.user=Parse.User.current();
      activity.save($scope.post, {
      success: function(activity) {
        // Push the new notification to the top of activity chart, probably through Activity service
        // alert("Activity ID : " + activity.id);
      },
      error: function(activity, error) {
        // Notify user that post has failed
        alert("Error in posting message " + error.message);
        $scope.postError=true;
        $scope.postErrorMessage=error.message;
      }
    });
    $location.path("/tab/dash");
  };

  $scope.cancelPost=function(){
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

.controller('RegisterCtrl', function($scope, $location) {

  $scope.user={};
  $scope.register=function() {

    var user=new Parse.User();
    user.set("username", $scope.user.phoneNum);
    user.set("password", "custom");
    user.set("firstName", $scope.user.firstName);
    user.set("lastName", $scope.user.lastName);
    user.set("residency", $scope.user.residency);

    user.signUp(null, {
      success: function(user) {
        $location.path("/tab/dash");
      },
      error: function(user, error) {
        // TODO :: Login the user for now and validate later on
        alert("Error signup : " + error.code + " message : " + error.message);
        Parse.User.logIn($scope.user.phoneNum, "custom", {
          success: function(user) {
            $location.path("/tab/dash");  
          },
          error: function(user, error) {
            alert("Error login : " + error.code + " message : " + error.message);
          }
        });
      }
    });
  }
})

.controller('AccountCtrl', function($scope, $location) {
  $scope.user = Parse.User.current();
  $scope.logout=function() {    
      Parse.User.logOut();
      $location.path("/tab/register");
  };
});
