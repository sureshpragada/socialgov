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
  $scope.phoneVerified=false;
  $scope.registerError=false;
  $scope.registerErrorMessage="";

  $scope.authPhoneNum=function() {

  Digits.logIn()
    .done(function(response){

      // if(response.status=="authorized")

      console.log("Response from done : " + JSON.stringify(response));
      var credentials = response.oauth_echo_headers['X-Verify-Credentials-Authorization'];
      var apiUrl = response.oauth_echo_headers['X-Auth-Service-Provider'];
      console.log(response.status + " " + credentials + " " + apiUrl);

      Parse.Cloud.run('validateDigits', {authToken: credentials, digitsUrl: apiUrl}, {
        success: function(data) {
          console.log("Cloud response : " + JSON.stringify(data));
          // Query to verify whether this user is already registered
          Parse.User.logIn($scope.user.phoneNum, "digits", {
            success: function(user) {
              console.log("User exists in the system. Skipping registration flow.");
              $location.path("/tab/dash");  
            },
            error: function(user, error) {
              console.log("User does not exists, continue with singup flow. Error login : " + error.code + " message : " + error.message);
              $scope.user.phoneNum=data.phone_number;
              $scope.phoneVerified=true;
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
        $location.path("/tab/dash");
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
