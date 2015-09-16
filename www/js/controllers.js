angular.module('starter.controllers', ['ngCordova', 'ionic'])

.controller('ActivityCtrl', function($scope, $http, NotificationService, LogService) {
  
  $scope.activityError=null;
  
  var user=Parse.User.current();

  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.equalTo("regionUniqueName", user.get("residency"));
  //console.log(user.id);
  query.include("user");
  query.descending("createdAt");
  query.find({
    success: function(results) {
      $scope.$apply(function(){
        if(results!=null && results.length>0) {
          $scope.activities=results;  
        } else {
          $scope.activityError="No activity found in your region.";
        }
      });
    }, 
    error: function(error) {
      $scope.$apply(function(){
        console.log("Unable to get activities : " + error.message);
        $scope.activityError="Unable to get activities.";
      });
    }
  });

  $scope.isAdmin=function() {
     if(Parse.User.current().get("role")=="JNLST") {
        return true; 
     } else {
        return false;
     }
  };

})

.controller('PostActivityCtrl', function($scope, $http, $state, NotificationService, LogService, RegionService) {
  $scope.post={"activityType": "NOTF", "notifyMessage": "", "regionUniqueName":Parse.User.current().get("residency")};
  $scope.postErrorMessage=null;
  $scope.submitPost=function() {
    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10 && $scope.post.notifyMessage.length<1024) {
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      $scope.post.user=Parse.User.current();
      activity.save($scope.post, {
        success: function(activity) {
          // Send the push notification
          NotificationService.pushNotification($scope.post.regionUniqueName, $scope.post.notifyMessage, function(response) {
            console.log("Response from pushNotification : " + JSON.stringify(response));
            LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
          }, function(error) {
            console.log("Error from pushNotification : " + JSON.stringify(error));
            LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
          });

          // Push the new activity to the top of activity chart, probably through Activity service
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
    } else {
      $scope.postErrorMessage="Message should be minimum 10 and maximum 1024 characters.";
    }
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

.controller('AdminAccessReqCtrl', function($scope, $state) {
  $scope.adminDetails={};
  $scope.adminRole=true;
  $scope.adminRequestErrorMessage=null;
  console.log($scope.adminDetails.role);
  $scope.isSelected=function() {
      $scope.adminRole=false;
  };
  $scope.submitDetails=function() {    
      if($scope.adminDetails.role!=null && $scope.adminDetails.title!=null && $scope.adminDetails.contributeMessage!=null &&$scope.adminDetails.contributeMessage.length>10 && $scope.adminDetails.contributeMessage.length<1024){
        var AccessRequest = Parse.Object.extend("AccessRequest");
        var accessRequest = new AccessRequest();
        accessRequest.set("role",$scope.adminDetails.role);
        accessRequest.set("title",$scope.adminDetails.title);
        accessRequest.set("contributeMessage",$scope.adminDetails.contributeMessage);
        accessRequest.set("status","PEND");
        //accessRequest.set("userId",Parse.User.current().id);
        accessRequest.set("user",Parse.User.current());
        console.log(JSON.stringify(accessRequest));
        accessRequest.save(null, {
          success: function(accessRequest) {
            //alert('New object created with objectId: ' + accessRequest.id);
            $scope.$apply(function(){
              $state.go("tab.account");    
            });
          },
          error: function(accessRequest, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            //alert('Failed to create new object, with error code: ' + error.message);
            console.log("Error in posting message " + error.message);
            $scope.adminRequestErrorMessage=error.message;
          }
        });
      }else{
          $scope.adminRequestErrorMessage="Fill the details properly";
      }
  };
  $scope.cancel=function(){
    $state.go("tab.account");
  };
})

.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService) {
  RegionService.all(function(data) {
    $scope.region=RegionService.get(data, $stateParams.regionUniqueName);
  });
})

.controller('AdminAccessReqDetailCtrl', function($scope, $stateParams, $state) {
  var AccessRequest = Parse.Object.extend("AccessRequest");
  var query=new Parse.Query(AccessRequest);
  query.get($stateParams.accessRequestId,{
    success: function(accessRequest) {
          $scope.accessRequest=accessRequest;
          console.log(JSON.stringify(accessRequest));
        }, 
        error: function(error) {
          console.log(error.message);
        }
  });

  $scope.approve=function(){
      $scope.accessRequest.set("status","APPR");
      $scope.accessRequest.save(null, {
        success: function(accessRequest) {
        console.log(JSON.stringify(accessRequest));
        }
      });
      $state.go("tab.adminAccessList");
      //console.log(JSON.stringify($scope.accessRequest));
  };

  $scope.reject=function(){
      $scope.accessRequest.set("status","RJCT");
      $scope.accessRequest.save(null, {
        success: function(accessRequest) {
          console.log(JSON.stringify(accessRequest));
        }
    });
    $state.go("tab.adminAccessList");
  };

  $scope.cancel=function(){
    $state.go("tab.adminAccessList");
  };
})

.controller('AdminAccessReqListCtrl', function($scope, $state) {
  $scope.accessRequests=null;
  $scope.adminAccessRequestListError=null;
  var AccessRequest = Parse.Object.extend("AccessRequest");
  var query=new Parse.Query(AccessRequest);
  //query.include("user");
  query.equalTo("status", "PEND");
  query.find({
    success: function(results) {
        if(results!=null && results.length>0) {
            console.log(JSON.stringify(results));
            $scope.$apply(function(){
              $scope.accessRequests=results;
            });
          } else {
              //$scope.activityError="No activity found in your region.";
              $scope.adminAccessRequestListError="No admin access requests to review";
          }
        }, 
        error: function(error) {
          $scope.adminAccessRequestListError="Unable to get admin access requests";
        }
      });

})

.controller('RegisterCtrl', function($scope, $state, $cordovaPush, LogService) {

  $scope.user={countryCode: "91", residency: "dowlaiswaram"};
  $scope.userRegistered=true;
  $scope.registerErrorMessage=null;

  $scope.authPhoneNum=function() {
    if($scope.user.phoneNum!=null && $scope.user.phoneNum.length==10) {
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
          $scope.registerErrorMessage=null;          
          $scope.$apply();
        }
      });
    } else {
      $scope.registerErrorMessage="Please enter 10 digit phone number.";
    }

  };
  //console.log($scope.user.residency);
  $scope.register=function() {
    // TODO :: Please use angular form validation to validate all the fields
    if($scope.user.phoneNum!=null && $scope.user.phoneNum.length==10) {
      if($scope.user.firstName!=null && $scope.user.firstName.length>0 && $scope.user.lastName!=null && $scope.user.lastName.length>0) {
        var user=new Parse.User();
        var userName=$scope.user.countryCode+""+$scope.user.phoneNum;
        user.set("username", userName);
        user.set("password", "custom");
        user.set("firstName", $scope.user.firstName);
        user.set("lastName", $scope.user.lastName);
        user.set("residency", $scope.user.residency);
        user.set("phoneNum", $scope.user.phoneNum);
        user.set("countryCode", $scope.user.countryCode);
        user.set("role", "CTZEN");
        user.set("notifySetting", true);
        user.signUp(null, {
          success: function(user) {
            console.log("Signup is success");        
            if(ionic.Platform.isAndroid()) {
              // Register with GCM
              var androidConfig = {
                "senderID": "927589908829",
              };

              $cordovaPush.register(androidConfig).then(function(result) {
                console.log("Register Success : " + result);
                LogService.log({type:"INFO", message: "Register attempt to GCM is success " + JSON.stringify(result)}); 
              }, function(err) {
                console.log("Register error : " + err);
                LogService.log({type:"ERROR", message: "Error registration attempt to GCM " + JSON.stringify(err)}); 
              });
            }
            $scope.$apply(function(){
              $state.go("tab.dash");
            });
          },
          error: function(user, error) {
            console.log("Signup error  : " + error.code + " " + error.message);
            $scope.registerErrorMessage=error.message;
            $scope.apply();
          }
        });
      } else {
        $scope.registerErrorMessage="Please enter first and last name.";  
      }
    } else {
      $scope.registerErrorMessage="Please enter 10 digit phone number.";
    }
  }
})

.controller('AccountCtrl', function($scope, $state) {
  $scope.user = Parse.User.current();
  $scope.settings={notifications: $scope.user.get("notifySetting")}; 
  $scope.accessRequestMessage=null;
  $scope.accessRequest=null;
  var AccessRequest = Parse.Object.extend("AccessRequest");
  var query=new Parse.Query(AccessRequest);
  query.equalTo("user", $scope.user);
  query.find({
    success: function(results) {
        if(results!=null && results.length>0) {
          console.log(JSON.stringify(results));
            $scope.$apply(function(){
              $scope.accessRequest=results[0];
              if($scope.accessRequest.get("status")=="PEND"){
                $scope.accessRequestMessage="Your access request request is in review";
              }
              else if($scope.accessRequest.get("status")=="APPR"){
                $scope.user.set("role","ADMN");
                $scope.user.set("title",$scope.accessRequest.get("title"));
                $scope.accessRequest.set("status","CMPL");
                $scope.accessRequest.save(null, {
                  success: function(accessRequest) {
                    console.log(JSON.stringify(accessRequest));
                  }
                });
                $scope.user.save(null, {
                  success: function(user) {
                    console.log(JSON.stringify(user));
                  }
                });
                console.log(JSON.stringify($scope.user));
                $scope.accessRequestMessage="Your have admin privileges!"; 
                console.log($scope.accessRequestMessage);
              } 
              else{
                $scope.accessRequestMessage="Sorry! We cannot give you admin privileges"; 
              }
            });

          } else {
              //$scope.activityError="No activity found in your region.";
              console.log("no");
          }
        }, 
        error: function(error) {
          //alert(error.code);
          
        }
      });

  $scope.isLogoutAllowed=function() {
    if(ionic.Platform.isAndroid()) {
      return false;
    } else {
      return true;
    }
  };

  $scope.logout=function() {    
      Parse.User.logOut();
      $scope.user=null;
      $state.go("register");    
  };

  $scope.isSuperAdmin=function(){
    var user=Parse.User.current();
    if(user.get("role")=="SUADM"){
      return true;
    }else{
      return false;
    }
  };

  $scope.isCitizen=function(){
    var user=Parse.User.current();
    if(user.get("role")=="CTZEN"){
      return true;
    }else{
      return false;
    }
  }
  $scope.getAccessRequestStatus=function() {
    
      var user=Parse.User.current();

  };

  $scope.notifySettingChanged=function(settingName, settingValue) {
    var user=Parse.User.current();
    user.set(settingName, settingValue);
    user.save(null, {
      success: function(user) {
        console.log(settingName + " changed to " + settingValue);        
        $scope.user=user;
        $scope.$apply();
      }
    });
  };

});
