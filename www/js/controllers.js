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
      $scope.$apply();
    }, 
    error: function(error) {
      console.log("Unable to get activities : " + error.message);
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
        $scope.$apply(function(){
          $location.path("/tab/dash");  
        });
      },
      error: function(activity, error) {
        // Notify user that post has failed
        console.log("Error in posting message " + error.message);
        $scope.postError=true;
        $scope.postErrorMessage=error.message;
        $scope.$apply();
      }
    });
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
  $scope.phoneVerified=false;
  $scope.registerError=false;
  $scope.registerErrorMessage="";

  $scope.authPhoneNum=function() {

  Digits.logIn()
    .done(function(response){
      // if(response.status=="authorized")
      $scope.phoneVerified=true;
      console.log("Response from done : " + JSON.stringify(response));
      Parse.Cloud.run('validateDigits', {authToken: response.oauth_echo_headers['X-Verify-Credentials-Authorization'], 
          digitsUrl: response.oauth_echo_headers['X-Auth-Service-Provider']}, {
        success: function(data) {
          console.log("Cloud response : " + JSON.stringify(data));
          $scope.user.phoneNum=data.phone_number;
          // Query to verify whether this user is already registered
          Parse.User.logIn($scope.user.phoneNum, "digits", {
            success: function(user) {
              console.log("User exists in the system. Skipping registration flow.");
              $scope.$apply(function(){
                $location.path("/tab/dash");  
              });
            },
            error: function(user, error) {
              console.log("User does not exists, continue with singup flow. Error login : " + error.code + " message : " + error.message);
              $scope.$apply();
            }
          });

        },
        error: function(error) {
          console.log("Digits cloud call error : " + error);
          $scope.registerError=true;
          $scope.registerErrorMessage=error;          
          $scope.$apply();
        }
      });
    })
    .fail(function(error){
      console.log("Digits login failure. " + error.type + " " + error.message);
      $scope.registerError=true;
      $scope.registerErrorMessage=error.message;                
      $scope.$apply();
    });
    
  };

  $scope.register=function() {

    var user=new Parse.User();
    user.set("username", $scope.user.phoneNum);
    user.set("password", "digits");
    user.set("firstName", $scope.user.firstName);
    user.set("lastName", $scope.user.lastName);
    user.set("residency", $scope.user.residency);

    user.signUp(null, {
      success: function(user) {
        console.log("Signup is success");
        $scope.$apply(function(){
          $location.path("/tab/dash");
        });
      },
      error: function(user, error) {
        console.log("Signup error  : " + error.code + " " + error.message);
        $scope.registerError=true;
        $scope.registerErrorMessage=error.message;
        $scope.apply();
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
