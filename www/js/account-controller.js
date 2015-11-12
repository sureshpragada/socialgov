angular.module('starter.controllers')

.controller('AdminAccessReqCtrl', function($scope, $state, AccountService) {
  $scope.allowedRoleChanges=AccountService.getRolesAllowedToChange();
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
            AccountService.updateAccessRequest(accessRequest);
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


.controller('AdminAccessReqDetailCtrl', function($scope, $stateParams, $state, AccountService) {
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
      AccountService.updateRoleAndTitle($scope.accessRequest.get('user').id, $scope.accessRequest.get('role'), $scope.accessRequest.get('title'));
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

.controller('RegisterCtrl', function($http, $scope, $state, $cordovaPush, LogService, RegionService, $ionicLoading, AccountService, NotificationService, $cordovaDialogs) {

  $scope.countryList=COUNTRY_LIST;
  $scope.selectedValues={country: $scope.countryList[0], highLevelRegion:null, finalLevelRegion: null};  
  $scope.user={};
  $scope.userRegistered=true;
  $scope.registerErrorMessage=null;

  $scope.validateSignIn=function() {

    if($scope.user.phoneNum!=null && $scope.user.phoneNum.length==10) {
      // if (ionic.Platform.isIOS()) {
          $http.get("img/license.txt")
            .success(function(data) {
              $cordovaDialogs.confirm(data, 'License Agreement', ['I Agree','Cancel'])
              .then(function(buttonIndex) {      
                if(buttonIndex==1) {
                  $scope.authPhoneNum();
                } else {
                  $scope.registerErrorMessage="Please accept license agreement.";
                }
              });
            }).error(function() {
                $scope.registerErrorMessage="Unable to read license content";
            });
      //}
    } else {
      $scope.registerErrorMessage="Please enter 10 digit phone number.";
    }
  }

  $scope.authPhoneNum=function() {
    $ionicLoading.show({
      template: "<ion-spinner></ion-spinner> Verifying your phone number..."
    });      
    var userName=$scope.selectedValues.country.countryCode+""+$scope.user.phoneNum;
    Parse.User.logIn(userName, "custom", {
      success: function(user) {
        console.log("User exists in the system. Skipping registration flow.");
        RegionService.initializeRegionCacheByCurrentUser();          
        if(user.get("deviceReg")=="N") {
          console.log("Device is not registered, attempting to register");
          $scope.registerDevice();
        } else {
          console.log("Device already registered");
        }
        $ionicLoading.hide();
        $state.go("tab.dash");
      },
      error: function(user, error) {
        console.log("User does not exists, continue with singup flow. Error login : " + error.code + " message : " + error.message);
        $scope.$apply(function() {
          $scope.userRegistered=false;
          $scope.registerErrorMessage=null;          
          RegionService.getLiteRegionList("regionType", REG_TOP_REGION_TYPES).then(function(data) {
            $scope.highLevelRegionList=data;
            // $scope.selectedValues={highLevelRegion:null, finalLevelRegion: null};
            $ionicLoading.hide();
          }, function(error) {
            console.log("Error while retrieving city list " + JSON.stringify(error));
            $registerErrorMessage="Unable to get city list for registration";
            $ionicLoading.hide();              
          });
        });
      }
    });
  };

  $scope.showNextLevelRegions=function() {
    RegionService.getLiteRegionList("parent", $scope.selectedValues.highLevelRegion.get('uniqueName')).then(function(data) {
      $scope.finalLevelRegionList=data;
      $scope.selectedValues.finalLevelRegion=$scope.finalLevelRegionList[0];
      $scope.$apply();
    }, function(error) {
      console.log("Unable to get next level region list for registration : " + JSON.stringify(error));
      $registerErrorMessage="Unable to get next level region list for registration";
    });
  };

  $scope.register=function() {
    // TODO :: Please use angular form validation to validate all the fields
    if($scope.user.phoneNum==null || $scope.user.phoneNum.length!=10) {
      $scope.registerErrorMessage="Please enter 10 digit phone number.";
      return;
    }

    if($scope.user.firstName==null || $scope.user.firstName.length==0 || $scope.user.lastName==null || $scope.user.lastName.length==0) {
      $scope.registerErrorMessage="Please enter first and last name."; 
      return;
    }

    if($scope.selectedValues.highLevelRegion==null || $scope.selectedValues.finalLevelRegion==null) {
      $scope.registerErrorMessage="Please select your residency.";
      return;
    }

    var user=new Parse.User();
    var userName=$scope.selectedValues.country.countryCode+""+$scope.user.phoneNum;
    user.set("username", userName);
    user.set("password", "custom");
    user.set("firstName", $scope.user.firstName.capitalizeFirstLetter());
    user.set("lastName", $scope.user.lastName.capitalizeFirstLetter());
    user.set("residency", $scope.selectedValues.finalLevelRegion.get("uniqueName"));
    user.set("phoneNum", $scope.user.phoneNum);
    user.set("countryCode", $scope.selectedValues.country.countryCode);
    user.set("role", "CTZEN");
    user.set("notifySetting", true);
    user.set("deviceReg", "N");
    user.set("status", "A");
    user.signUp(null, {
      success: function(user) {
        console.log("Signup is success");        
        RegionService.initializeRegionCache($scope.selectedValues.finalLevelRegion);
        $scope.registerDevice();
        $state.go("tab.dash");
      },
      error: function(user, error) {
        console.log("Signup error  : " + error.code + " " + error.message);
        $scope.registerErrorMessage=error.message;
        $scope.apply();
      }
    });
  };

  $scope.registerDevice=function() {
    if(ionic.Platform.isWebView() && ionic.Platform.isAndroid()) {
      // Register with GCM
      var androidConfig = {
        "senderID": GCM_SENDER_ID
      };

      $cordovaPush.register(androidConfig).then(function(result) {
        LogService.log({type:"INFO", message: "Registration attempt to GCM is success " + JSON.stringify(result)}); 
      }, function(err) {
        LogService.log({type:"ERROR", message: "Registration attempt to GCM is failed for  " + Parse.User.current().id + " " +  JSON.stringify(err)}); 
      });

    } else if(ionic.Platform.isWebView() && ionic.Platform.isIOS()){

      var iosConfig = {
          "badge": true,
          "sound": true,
          "alert": true,
        };          

      $cordovaPush.register(iosConfig).then(function(deviceToken) {
        var channelList=RegionService.getRegionHierarchy();            
        LogService.log({type:"INFO", message: "iOS Registration is success : " + deviceToken + " registering for channel list : " + channelList + " for user : " + Parse.User.current().id});             
        NotificationService.addIOSInstallation(Parse.User.current().id, deviceToken, channelList);            
      }, function(err) {
        LogService.log({type:"ERROR", message: "IOS registration attempt failed for " + Parse.User.current().id + "  " + JSON.stringify(err)}); 
      });
    }
  };

})

.controller('AccountCtrl', function($scope, $state, RegionService, LogService, AccountService, $cordovaPush) {
  $scope.user = AccountService.getUser();
  $scope.settings={notifications: $scope.user.get("notifySetting")}; 
  $scope.accessRequestMessage=null;
  $scope.accessRequest=null;
  $scope.isPendingRequest=false;
  AccountService.getAccessRequest().then(function(accessrequest){
    console.log("Access request returned from cache : " + JSON.stringify(accessrequest));
    if(accessrequest!=null && accessrequest!="NO_DATA_FOUND") {
      $scope.accessRequest=accessrequest;
      if($scope.accessRequest.get("status")=="PEND"){              
        $scope.accessRequestMessage="Your role change request is in review.";
        $scope.isPendingRequest=true;
      } else if($scope.accessRequest.get("status")=="RJCT") {
        $scope.accessRequestMessage="Your role change request is rejected.";
      }      
    }
  }, function() {
    $scope.accessRequestMessage="Unable to retrieve status of your role change request.";
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
    if(Parse.User.current()!=null) {
      if(ionic.Platform.isAndroid() && Parse.User.current().get("lastName")!="Pragada") {
        return false;
      } else {
        return true;
      }      
    } else {
      return false;
    }
  };

  $scope.logout=function() {    
    Parse.User.logOut();
    $scope.user=null;
    // $scope.$apply(function(){
      $state.go("register");      
    // });
  };

  $scope.isSuperAdmin=function(){
    if(Parse.User.current()!=null) {
      return AccountService.isSuperAdmin(Parse.User.current().get("role"));  
    } else {
      return false;
    }
  };

  $scope.isCitizen=function(){
    if(Parse.User.current()!=null) {
      return AccountService.isCitizen(Parse.User.current().get("role"));
    } else {
      return false;
    }    
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