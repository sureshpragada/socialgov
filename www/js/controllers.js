angular.module('starter.controllers', [])

.controller('ActivityCtrl', function($scope, $http) {
  
  $scope.activityError=false;
  
  var user=Parse.User.current();

  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.equalTo("regionUniqueName", user.get("residency"));
  query.include("user");
  query.descending("createdAt");
  query.find({
    success: function(results) {
      $scope.$apply(function(){
        $scope.activities=results;
      });
    }, 
    error: function(error) {
      $scope.$apply(function(){
        console.log("Unable to get activities : " + error.message);
        $scope.activityError=true;
        $scope.activityMessage=error.message;
      });
    }
  });

  $scope.isAdmin=function() {
     return ["914088324304"].indexOf(Parse.User.current().getUsername())!=-1;
  };

})

.controller('PostActivityCtrl', function($scope, $http, $state) {
  
  $scope.post={"activityType": "NOTF", "notifyMessage": "", "regionUniqueName":"dowlaiswaram"};

  $scope.submitPost=function() {
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      $scope.post.user=Parse.User.current();
      activity.save($scope.post, {
      success: function(activity) {
        // Push the new notification to the top of activity chart, probably through Activity service
        $scope.$apply(function(){
          $state.go("tab.dash");  
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
    $state.go("tab.dash");
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

.controller('RegisterCtrl', function($scope, $state) {

  $scope.user={countryCode: "91", residency: "dowlaiswaram"};
  $scope.userRegistered=true;
  $scope.registerError=false;
  $scope.registerErrorMessage="";

  $scope.authPhoneNum=function() {
    var userName=$scope.user.countryCode+""+$scope.user.phoneNum;
    Parse.User.logIn(userName, "custom", {
      success: function(user) {
        console.log("User exists in the system. Skipping registration flow.");
        $scope.$apply(function(){
          $state.go("tab.dash");
        });
      },
      error: function(user, error) {
        console.log("User does not exists, continue with singup flow. Error login : " + error.code + " message : " + error.message);
        $scope.userRegistered=false;
        $scope.$apply();
      }
    });

  };

  $scope.register=function() {

    var user=new Parse.User();
    var userName=$scope.user.countryCode+""+$scope.user.phoneNum;
    user.set("username", userName);
    user.set("password", "custom");
    user.set("firstName", $scope.user.firstName);
    user.set("lastName", $scope.user.lastName);
    user.set("residency", $scope.user.residency);
    user.set("phoneNum", $scope.user.phoneNum);
    user.set("countryCode", $scope.user.countryCode);

    user.signUp(null, {
      success: function(user) {
        console.log("Signup is success");
        $scope.$apply(function(){
          $state.go("tab.dash");
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

.controller('AccountCtrl', function($scope, $state) {
  $scope.user = Parse.User.current();
  $scope.logout=function() {    
      Parse.User.logOut();
      $scope.user=null;
      $state.go("register");    
  };
});
