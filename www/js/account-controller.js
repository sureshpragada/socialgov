angular.module('starter.controllers')

.controller('AdminAccessReqCtrl', function($scope, $state, AccountService) {
  $scope.allowedRoleChanges=AccountService.getAllowedRoles();
  $scope.adminDetails={reason:"", selectedRoleType: $scope.allowedRoleChanges[0], selectedTitle: $scope.allowedRoleChanges[0].titles[0]};
  $scope.adminRequestErrorMessage=null;

  $scope.roleSelectionChanged=function() {
    if($scope.adminDetails.selectedRoleType.titles.length>0) {
      $scope.adminDetails.selectedTitle=$scope.adminDetails.selectedRoleType.titles[0];
    } else {
      $scope.adminDetails.selectedTitle=null;
    }
  };

  $scope.submitDetails=function() {    
      if($scope.adminDetails.reason!=null && $scope.adminDetails.reason.length>10 && $scope.adminDetails.reason.length<1024){
        var AccessRequest = Parse.Object.extend("AccessRequest");
        var accessRequest = new AccessRequest();
        accessRequest.set("role",$scope.adminDetails.selectedRoleType.id);
        accessRequest.set("title",$scope.adminDetails.selectedTitle==null?$scope.adminDetails.selectedRoleType.label:$scope.adminDetails.selectedTitle.id);
        accessRequest.set("reason",$scope.adminDetails.reason);
        accessRequest.set("status","PEND");
        accessRequest.set("user",Parse.User.current());
        console.log(JSON.stringify(accessRequest));
        accessRequest.save(null, {
          success: function(accessRequest) {
            $scope.$apply(function(){
              $state.go("tab.account");    
            });
          },
          error: function(accessRequest, error) {
            console.log("Error in submitting accessrequest " + error.message);
            $scope.adminRequestErrorMessage="Unable to submit your role change request.";
          }
        });
      }else{
          $scope.adminRequestErrorMessage="Provide your contribution details at least 10 characters.";
      }
  };

  $scope.cancel=function(){
    $state.go("tab.account");
  };

})


.controller('AdminAccessReqDetailCtrl', function($scope, $stateParams, $state) {
  var AccessRequest = Parse.Object.extend("AccessRequest");
  var query=new Parse.Query(AccessRequest);
  query.include("user");
  query.get($stateParams.accessRequestId,{
    success: function(accessRequest) {
          $scope.accessRequest=accessRequest;
          // console.log(JSON.stringify(accessRequest));
        }, 
        error: function(error) {
          console.log(error.message);
        }
  });

  $scope.update=function(status){
      $scope.accessRequest.set("status",status);
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
  query.include("user");
  query.equalTo("status", "PEND");
  query.find({
    success: function(results) {
        if(results!=null && results.length>0) {
            console.log(JSON.stringify(results));
            $scope.$apply(function(){
              $scope.accessRequests=results;
            });
          } else {
              $scope.adminAccessRequestListError="No role changes requests to review";
          }
        }, 
        error: function(error) {
          $scope.adminAccessRequestListError="Unable to get role change requests";
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

.controller('AccountCtrl', function($scope, $state, RegionService, LogService, AccountService, $cordovaPush) {
  $scope.user = Parse.User.current();
  $scope.settings={notifications: $scope.user.get("notifySetting")}; 
  $scope.accessRequestMessage=null;
  $scope.accessRequest=null;
  var AccessRequest = Parse.Object.extend("AccessRequest");
  var query=new Parse.Query(AccessRequest);
  query.equalTo("user", $scope.user);
  query.descending("createdAt");
  query.find({
    success: function(results) {
      if(results!=null && results.length>0) {
        console.log(JSON.stringify(results));
          $scope.$apply(function(){
            $scope.accessRequest=results[0];
            if($scope.accessRequest.get("status")=="APPR"){
              $scope.user.set("role",$scope.accessRequest.get("role"));
              $scope.user.set("title",$scope.accessRequest.get("title"));
              $scope.accessRequest.set("status","CMPL");
              $scope.accessRequest.save(null, {
                error: function(error) {
                  console.log("Error while saving accessrequest : " + JSON.stringify(error));
                  LogService.log({type:"ERROR", message: "Error while saving accessrequest :" + JSON.stringify(error)});           
                }
              });
              $scope.user.save(null, {
                error: function(error) {
                  console.log("Error while saving user : " + JSON.stringify(error));
                  LogService.log({type:"ERROR", message: "Error while saving user :" + JSON.stringify(error)});                               
                }
              });
            } else {
              if($scope.accessRequest.get("status")=="PEND"){
                $scope.accessRequestMessage="Your role change request is in review.";
              } else {
                $scope.accessRequestMessage="Sorry! We are unable to process your role change."; 
              }
            }               
          });
        } else {
            console.log("No access requests found");
        }
      }, 
      error: function(error) {
        console.log("Error retrieving role change requests. " + JSON.stringify(error));          
      }
    });

  RegionService.getRegion($scope.user.get("residency")).then(function(region){
    $scope.regionDisplayName=region.get("name");
  }, function() {
    $scope.regionDisplayName=user.get("residency");
  });

  $scope.getRoleNameFromRoleCode=function(role) {
    return AccountService.getRoleNameFromRoleCode(role);
  };

  $scope.isLogoutAllowed=function() {
    if(ionic.Platform.isAndroid() && $scope.user.get("lastName")!="Pragada") {
      return false;
    } else {
      return true;
    }
  };

  $scope.logout=function() {    
      Parse.User.logOut();
      $scope.user=null;
      console.log("After user has been made null");
      $state.go("register");    
  };

  $scope.isSuperAdmin=function(){
    return AccountService.isSuperAdmin(Parse.User.current().get("role"));
  };

  $scope.isCitizen=function(){
    return AccountService.isCitizen(Parse.User.current().get("role"));
  }

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