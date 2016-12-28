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
    $ionicLoading.show(SettingsService.getLoadingMessage("Verifying your phone number"));
    var userName=$scope.selectedValues.country.countryCode+""+$scope.user.phoneNum;
    Parse.User.logIn(userName, "custom", {
      success: function(user) {
        console.log("User exists in the system. Skipping registration flow.");
        RegionService.initializeRegionCacheByCurrentUser();          
        if(user.get("deviceReg")=="N") {
          console.log("Device is not registered, attempting to register");
          NotificationService.registerDevice();
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
        NotificationService.registerDevice();
        $state.go("tab.dash");
      },
      error: function(user, error) {
        console.log("Signup error  : " + error.code + " " + error.message);
        $scope.registerErrorMessage=error.message;
        $scope.apply();
      }
    });
  };

  // $scope.registerDevice=function() {
  //   if(ionic.Platform.isWebView() && ionic.Platform.isAndroid()) {
  //     // Register with GCM
  //     var androidConfig = {
  //       "senderID": GCM_SENDER_ID
  //     };

  //     $cordovaPush.register(androidConfig).then(function(result) {
  //       LogService.log({type:"INFO", message: "Registration attempt to GCM is success " + JSON.stringify(result)}); 
  //     }, function(err) {
  //       LogService.log({type:"ERROR", message: "Registration attempt to GCM is failed for  " + Parse.User.current().id + " " +  JSON.stringify(err)}); 
  //     });

  //   } else if(ionic.Platform.isWebView() && ionic.Platform.isIOS()){

  //     var iosConfig = {
  //         "badge": true,
  //         "sound": true,
  //         "alert": true,
  //       };          

  //     $cordovaPush.register(iosConfig).then(function(deviceToken) {
  //       var channelList=RegionService.getRegionHierarchy();            
  //       LogService.log({type:"INFO", message: "iOS Registration is success : " + deviceToken + " registering for channel list : " + channelList + " for user : " + Parse.User.current().id});             
  //       NotificationService.addIOSInstallation(Parse.User.current().id, deviceToken, channelList);            
  //     }, function(err) {
  //       LogService.log({type:"ERROR", message: "IOS registration attempt failed for " + Parse.User.current().id + "  " + JSON.stringify(err)}); 
  //     });
  //   }
  // };

})

.controller('AccountCtrl', function($scope, $state, RegionService, LogService, AccountService, NotificationService, SettingsService, $ionicModal, PictureManagerService, $cordovaClipboard, $ionicLoading, $interval) {
  SettingsService.trackView("Account controller");
  $scope.user = AccountService.getUser();
  $scope.regionSettings=RegionService.getRegionSettings($scope.user.get("residency"));    
  $scope.settings={notifications: $scope.user.get("notifySetting")}; 
  $scope.privs={
    isSuperAdmin: AccountService.isSuperAdmin(), 
    isCitizen: AccountService.isCitizen(),
    isLogoutAllowed: AccountService.isLogoutAllowed($scope.user), 
    isDeviceRegistered: ionic.Platform.isWebView() && $scope.user.get('deviceReg')=='Y'
  };

  console.log("Register device : " + $scope.user.get('deviceReg') + " Privs : " + $scope.privs.isDeviceRegistered);
  $scope.appVersion=APP_VERSION;

  $scope.appMessage=SettingsService.getAppMessage();  

  var stateData=PictureManagerService.getState();
  if(stateData.imageUrl!=null) {
    var images=Parse.User.current().get("images");
    if(images!=null && images.length>0) {
      images.unshift(stateData.imageUrl);
      console.log("Image URL being added at front");
    } else {
      images=[stateData.imageUrl];
      console.log("Image URL being added");
    }
    Parse.User.current().set("images", images);
    Parse.User.current().save();
    console.log("Images have been saved");
    PictureManagerService.reset();
    console.log("Picture service is reset");
    $scope.user=Parse.User.current();
  } else {
    console.log("Image URL is null");
  }

  $scope.isPendingRequest=false;
  if($scope.regionSettings.hoa==false) {
    AccountService.getAccessRequest().then(function(accessrequest){
      console.log("Access request returned from cache : " + JSON.stringify(accessrequest));
      if(accessrequest!=null && accessrequest!="NO_DATA_FOUND") {
        if(accessrequest.get("status")=="PEND"){              
          $scope.accessRequestMessage=SettingsService.getControllerInfoMessage("Your role change request is in review.");
          $scope.isPendingRequest=true;
        } else if(accessrequest.get("status")=="RJCT") {
          $scope.accessRequestMessage=SettingsService.getControllerErrorMessage("Your role change request is rejected.");
        }      
      }
    }, function(error) {
      LogService.log({type:"ERROR", message: "Unable to get access request for current user "+JSON.stringify(error)});     
      $scope.accessRequestMessage=SettingsService.getControllerErrorMessage("Unable to retrieve status of your role change request.");
    });
  }

  RegionService.getRegion($scope.user.get("residency")).then(function(region){
    $scope.regionDisplayName=region.get("name");
  }, function(error) {
    $scope.regionDisplayName=$scope.user.get("residency").capitalizeFirstLetter();
  });

  AccountService.getCurrentUserResidencies().then(function(userResidencyList){
    if(userResidencyList!=null && userResidencyList.length>1){
      $scope.canSwitchResidency=true;
    }
  },function(error){
    LogService.log({type:"ERROR", message: "Unable to get user residency for current user "+JSON.stringify(error)});     
  });

  $scope.switchResidency=function(){
    $state.go("tab.account-switch");
  };

  $scope.getRoleNameFromRoleCode=function(role) {
    return AccountService.getRoleNameFromRoleCode(role);
  };

  $scope.registerDevice=function() {
    $ionicLoading.show(SettingsService.getLoadingMessage("Registering device"));
    NotificationService.registerDevice();
    // Wait for 5 seconds to complete the registration
    $interval(function(){
        Parse.User.current().fetch().then(function(newUser) {
          if(newUser.get('deviceReg')=='Y') {
            $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Device registration is successful");
            $scope.privs.isDeviceRegistered=true;
          } else {
            $scope.controllerMessage=SettingsService.getControllerInfoMessage("Device registration is failed. Please try again later.");
          }
          $ionicLoading.hide();
        }, function(error) {
          $scope.controllerMessage=SettingsService.getControllerInfoMessage("Device registration is failed. Please try again later.");
          $ionicLoading.hide();
        });                       
    }, 5000, 1);    
  };

  $scope.logout=function() {    
    Parse.User.logOut();
    $scope.user=null;
    $state.go("home");      
  };

  $scope.notifySettingChanged=function(settingName, settingValue) {
    SettingsService.trackEvent("Account", "NotifySettingChanged");
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

  $scope.copyInvitationCode=function() {
    $cordovaClipboard.copy($scope.user.id).then(function () {
      $scope.copyStatusMessage=SettingsService.getControllerInfoMessage("Invitation code has been copied to clipboard.");
      $interval(function(){
        $scope.copyStatusMessage=null;
      }, 5000, 1);
    }, function () {
      $scope.copyStatusMessage=SettingsService.getControllerErrorMessage("Unable to copy invitation code to clipboard.");
    });
  };  

  $ionicModal.fromTemplateUrl('templates/picture-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  })  

  $scope.showProfilePicture = function() {
    $scope.changeProfilePic=true;
    if($scope.user.get("images")!=null && $scope.user.get("images").length>0) {
      $scope.imageUrl=$scope.user.get("images")[0];
    } else {
      $scope.imageUrl="img/avatar2.png";
    }
    $scope.modal.show();
  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.uploadProfilePicture=function() {
    SettingsService.trackEvent("Account", "UploadProfilePicture");
    PictureManagerService.reset();
    PictureManagerService.setFromPage("tab.account");
    $state.go("tab.account-picman");
  };

})

.controller('SwitchResidencyCtrl', function($scope, $state, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService, $ionicLoading, ActivityService) {
  SettingsService.trackView("Switch residency controller");  

  var currentResidency=AccountService.getUserResidency();
  AccountService.getCurrentUserResidencies().then(function(userResidencyList){
    $scope.userResidencies=userResidencyList;
    if($scope.userResidencies!=null && $scope.userResidencies.length>0) {
      var residencyNames=[];
      for(var i=0; i<$scope.userResidencies.length; i++){
        if(currentResidency!=$scope.userResidencies[i].get("residency")) {
          residencyNames.push($scope.userResidencies[i].get("residency"));
        }      
      }
      RegionService.getRegionsByRegionUniqueNames(residencyNames).then(function(regions){
        $scope.regions = regions;
        $scope.$apply();
      },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get region details.");
      });
    } else {      
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("You are not part of any residential community. Please request your legislative board to add you to the community.");  
    }
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get user residencies.");
  });

  $scope.switchResidency=function(residencyIndex){
    $ionicLoading.show(SettingsService.getLoadingMessage("Switching Community"));
    
    var userResidencyToBeSwitched=null;
    for(var i=0;i<$scope.userResidencies.length;i++) {
      if($scope.userResidencies[i].get("residency")==$scope.regions[residencyIndex].get("uniqueName")) {
        userResidencyToBeSwitched=$scope.userResidencies[i];
        break;
      }
    }

    if(userResidencyToBeSwitched!=null) {
      AccountService.switchResidency(userResidencyToBeSwitched).then(function(user){
        console.log("Switched residency");
        RegionService.initializeRegionCacheByCurrentUser();
        ActivityService.refreshActivityCache();
        AccountService.refreshResidentCache();
        $ionicLoading.hide();
        $state.go("tab.account");
      },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to switch residency.");
        $ionicLoading.hide();
      });      
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find the residency.");
      $ionicLoading.hide();
    }

  };

})

.controller('AccountUpdateCtrl', function($scope, $state, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService, UtilityService) {
  SettingsService.trackView("Account update controller");  

  var user=AccountService.getUser();
  $scope.inputUser={
    firstName: user.get("firstName"), 
    lastName: user.get("lastName"),
    homeNumber: user.get("homeNo"),
    bloodGroup: user.get("bloodGroup"),
    email: user.get("email")
  };
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());  

  $scope.update=function() {
    SettingsService.trackEvent("Account", "UpdateAccount");
    console.log("Update request " + JSON.stringify($scope.inputUser));

    // if($scope.regionSettings.supportHomeNumber==true) {
    //   if($scope.inputUser.homeNumber==null || $scope.inputUser.homeNumber.length<=0) {
    //     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home, unit or apt number.");
    //     return;
    //   } else {
    //     $scope.inputUser.homeNumber=$scope.inputUser.homeNumber.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    //   }
    // }    

    if($scope.inputUser.firstName==null || $scope.inputUser.lastName==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first and last name.");
    } else if(!UtilityService.isValidEmail($scope.inputUser.email)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter proper email.");
    } else {
      AccountService.updateAccount($scope.inputUser).then(function(newUser) {
        SettingsService.setAppSuccessMessage("Account update is successful.");
        $state.go("tab.account");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update your account.");  
      });
    }
  };

})

.controller('InvitationLoginCtrl', function($scope, $state, RegionService, LogService, AccountService, $cordovaDialogs, SettingsService, NotificationService, $http, UtilityService, $ionicLoading) {
  SettingsService.trackView("Invitation login controller");    
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.countryList=COUNTRY_LIST;
  $scope.inputForm={
    phoneNum: "",
    pin: "",
    pinLength: PIN_LENGTH, 
    country: $scope.countryList[0],
    requestedAccessCode: false
  };
  $scope.user=null;

  $scope.getAccessCode=function() {
    SettingsService.trackEvent("Account", "GetAccessCode");
    if($scope.inputForm.phoneNum.length==10) {
      $ionicLoading.show(SettingsService.getLoadingMessage("Sending access code"));      
      AccountService.getUserByUserName($scope.inputForm.country.countryCode+""+$scope.inputForm.phoneNum).then(function(userList) {
        if(userList!=null && userList.length==1) {
          $scope.user=userList[0];
          $scope.inputForm.code=UtilityService.generateRandomNumber(PIN_LENGTH);
          NotificationService.sendInvitationCodeV2("access-code", $scope.user.get("username"), "", $scope.inputForm.code);
          $scope.controllerMessage=SettingsService.getControllerInfoMessage("Access code has been sent as SMS to your mobile number.");          
          $scope.inputForm.requestedAccessCode=true;          
          $scope.$apply();          
          $ionicLoading.hide();
        } else {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("We do not find your invtation. Please contact your association for the invitation.");          
          LogService.log({type:"ERROR", message: "We do not find your invtation " + $scope.inputForm.country.countryCode+""+$scope.inputForm.phoneNum});           
          $ionicLoading.hide();
        }
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to query user system for your information.");
        LogService.log({type:"ERROR", message: "Unable to query user system for your information " + $scope.inputForm.phoneNum + " " + JSON.stringify(error)}); 
        $ionicLoading.hide();
      }); 
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter 10 digit mobile number.");
    }
  };

  $scope.validateInvitationCode=function() {
    SettingsService.trackEvent("Account", "ValidateInvitationCode");
    console.log("Validating invitation code ");
    if($scope.inputForm.pin.length==PIN_LENGTH) {
      if($scope.inputForm.pin==$scope.inputForm.code) {
          $ionicLoading.show(SettingsService.getLoadingMessage("Validating access code"));       
          Parse.User.logIn($scope.user.get("username"), "custom").then(function(authoritativeUser) {
            authoritativeUser.set("status", "A");
            authoritativeUser.save();                
            NotificationService.registerDevice();
            $ionicLoading.hide();            
            $state.go("tab.dash");            
          }, function(error) {
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to log you into the system at this time.");  
            LogService.log({type:"ERROR", message: "Unable to log you into the system at this time " + JSON.stringify(error)});                       
            $ionicLoading.hide();
          });            
      } else {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter access code received in SMS message.");  
      }
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Access code should be " + PIN_LENGTH + " digit number.");
    }
  };

  $scope.recoverInvitationCode=function() {
    $state.go("invite-recover");
  };  

  $scope.showTerms=function() {   
    SettingsService.trackEvent("Account", "ShowTerms"); 
    $http.get("img/license.txt")
      .success(function(data) {
        $cordovaDialogs.alert(data, 'Terms & Conditions');
      }).error(function() {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to read license content");
      });    
  };

})

.controller('InvitationRecoverCtrl', function($scope, $state, RegionService, AccountService, SettingsService, $cordovaContacts, NotificationService, LogService) {
  $scope.user={};
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.controllerMessage=SettingsService.getControllerInfoMessage("Invitation code will be sent as SMS to your phone number.");
  $scope.recoverInvitationCode=function(){
    console.log(JSON.stringify($scope.user));    
    if($scope.user.firstName==null || $scope.user.firstName.length==0 || $scope.user.lastName==null || $scope.user.lastName.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first and last name."); 
      return;
    }    
    if($scope.user.phoneNum==null || $scope.user.phoneNum.length!=10) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter 10 digit phone number");
      return;
    }

    AccountService.recoverInvitationCode($scope.user).then(function(recoveredUser) {
      if(recoveredUser!=null) {
        NotificationService.sendInvitationCode(recoveredUser.get("pin"), recoveredUser.get("username"), "");
        SettingsService.setAppSuccessMessage("New PIN is sent as an SMS to your mobile.");
        $state.go("invite-login");
      } else {
        LogService.log({type:"ERROR", message: "Unable to recover your PIN " + $scope.user.phoneNum}); 
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to recover your PIN.");        
        $scope.$apply();
      }
    }, function(error) { 
        LogService.log({type:"ERROR", message: "Unable to recover your PIN " + $scope.user.phoneNum + " Message : " + JSON.stringify(error)});       
       $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to recover your PIN.");
    });
  };

})

.controller('ResetPinCtrl', function($scope, $state, RegionService, AccountService, SettingsService, $cordovaContacts, NotificationService, LogService) {
  $scope.inputForm={
    newPin: "",
    reenterPin: "",
    pinLength: PIN_LENGTH
  };
  console.log("Ping length : " + $scope.inputForm.pinLength);
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.controllerMessage=SettingsService.getControllerInfoMessage("PIN length should be " + PIN_LENGTH + " digits.");
  var pageTransitionData=SettingsService.getPageTransitionData();
  $scope.resetPin=function(){
    console.log(JSON.stringify($scope.inputForm));    
    if($scope.inputForm.newPin.trim().length==0 || $scope.inputForm.reenterPin.trim().length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter new PIN."); 
      return;
    }    
    if($scope.inputForm.newPin.trim()!=$scope.inputForm.reenterPin.trim()) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please re-enter the PIN."); 
      return;
    }        
    if(pageTransitionData!=null && pageTransitionData.currentPin==$scope.inputForm.newPin.trim()) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Your new PIN cannot match old PIN.");
      return;
    }

    AccountService.resetPin($scope.inputForm).then(function(userList) {
      SettingsService.setAppSuccessMessage("Your PIN reset is successful.");
      $state.go("tab.dash");
    }, function(error) { 
       $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to reset your PIN.");
    });
  };

})

.controller('RegionLookUpCtrl', function($scope, $state, RegionService, AccountService, SettingsService, $cordovaContacts, NotificationService) {
  $scope.countryList=COUNTRY_LIST;
  $scope.selectedValues={country: $scope.countryList[0], highLevelRegion:null, finalLevelRegion: null};  
  $scope.lookUpError=null;
  $scope.user={status:"T",residency:null};

  RegionService.getLiteRegionList("regionType", REG_TOP_REGION_TYPES).then(function(data) {
      $scope.highLevelRegionList=data;
            // $scope.selectedValues={highLevelRegion:null, finalLevelRegion: null};
      }, function(error) {
      console.log("Error while retrieving city list " + JSON.stringify(error));
  });    

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

  $scope.getInvitationCode=function(){
    if($scope.selectedValues.highLevelRegion==null || $scope.selectedValues==null){
      $scope.lookUpError = "Please select your residency";
      return;
    }
    if($scope.user.phoneNum==null || $scope.user.phoneNum.length!=10) {
      $scope.lookUpError="Please enter 10 digit phone number.";
      return;
    }
    if($scope.user.firstName==null || $scope.user.firstName.length==0 || $scope.user.lastName==null || $scope.user.lastName.length==0) {
      $scope.lookUpError="Please enter first and last name."; 
      return;
    }
    $scope.user.residency=$scope.selectedValues.finalLevelRegion.get("uniqueName");
    console.log(JSON.stringify($scope.user));
    AccountService.addLookUpContact($scope.user).then(function(newUser) {
      // Send invitation
      // NotificationService.sendInvitationCode(newUser.id, newUser.get("username"));
      SettingsService.setAppSuccessMessage("Invitation has been requested.");
      console.log(newUser);
      $state.go("invite-login");
    }, function(error) { 
      if(error.code==202) {
        // $scope.controllerMessage=SettingsService.getControllerErrorMessage("Contact already have invitation.");  
        var objectId = AccountService.getUserObjectByPhoneNumber($scope.user.phoneNum);
        console.log(objectId);
        if(objectId!=null){
         //NotificationService.sendInvitationCode(objectId, $scope.user.phoneNum);  
         SettingsService.setAppSuccessMessage("Invitation has been requested.");
        }
        else{
          SettingsService.setAppSuccessMessage("Sorry!You have requested for too many times.");
        }
        $state.go("invite-login");
      } else {
        //$scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to invite this contact.");  
      }
      $scope.$apply();
    });

  };

})


.controller('HomeCtrl', function($scope, $stateParams, $state, AccountService, SettingsService) {
  SettingsService.trackView("Home controller");    
  $scope.setUpCommunity=function() {
    $state.go("community-info");
  };

  $scope.haveInvitationCode=function() {
    $state.go("invite-login");
  };
})

.controller('CommunityAddressCtrl', function($scope, $stateParams, $state, AccountService, SettingsService) {
  SettingsService.trackView("Community address controller");      
  $scope.tipMessage=SettingsService.getControllerInfoMessage("Tell us where this community is located;");
  $scope.controllerMessage=null;  
  $scope.communityAddress=AccountService.getCommunityAddress();
  $scope.countryList=COUNTRY_LIST;
  
  $scope.next=function() {
    SettingsService.trackEvent("Account", "AddCommunityAddress");
    console.log(JSON.stringify($scope.communityAddress));    
    if($scope.communityAddress.addressLine1==null || $scope.communityAddress.addressLine1.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community street name."); 
      return; 
    }
    if($scope.communityAddress.city==null || $scope.communityAddress.city.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community city."); 
      return;  
    }
    if($scope.communityAddress.state==null || $scope.communityAddress.state.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community state."); 
      return;  
    }
    if($scope.communityAddress.pinCode==null || $scope.communityAddress.pinCode.trim().length<5){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community postal code."); 
      return;  
    }
    AccountService.setCommunityAddress($scope.communityAddress);
    $state.go("your-info");
  };

  $scope.cancel=function() {
    $state.go("home");
  };
  
})

.controller('CommunityInfoCtrl', function($scope, $stateParams, $state, AccountService, SettingsService) {
  SettingsService.trackView("Community info controller");        
  $scope.controllerMessage=null;  
  $scope.tipMessage=SettingsService.getControllerInfoMessage("Tell us about your community;");
  $scope.communityInfo=AccountService.getCommunityInfo($scope.communityInfo);

  $scope.next=function() {
    SettingsService.trackEvent("Account", "AddCommunityInfo");
    console.log(JSON.stringify($scope.communityInfo));
    if($scope.communityInfo.name==null || $scope.communityInfo.name.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community name."); 
      return; 
    }

    if($scope.communityInfo.noOfUnits==null || $scope.communityInfo.noOfUnits.length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter number of units in your community."); 
      return; 
    }

    if($scope.communityInfo.year==null || $scope.communityInfo.year<1500) {      // Since HTML defines this field as number, we cant do length
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter valid establishment year."); 
      return;  
    }
    
    AccountService.setCommunityInfo($scope.communityInfo);
    $state.go("community-address");
  };

  $scope.cancel=function() {
    $state.go("home");
  };
  
})

.controller('YourInfoCtrl', function($scope, $stateParams, $state, AccountService, SettingsService, LogService, NotificationService, RegionService, ActivityService, $ionicLoading) {
  SettingsService.trackView("Your info controller");          
  $scope.tipMessage=SettingsService.getControllerInfoMessage("Tell us about yourself; You will be setup as admin to build community;");        
  $scope.controllerMessage=null;
  $scope.user=AccountService.getYourInfo();
  $scope.communityInfo=AccountService.getCommunityInfo();

  $scope.submit=function() {
    SettingsService.trackEvent("Account", "Registering");
    console.log(JSON.stringify($scope.user));    
    if($scope.user.firstName==null || $scope.user.firstName.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter your firstname."); 
      return;
    } 

    if($scope.user.lastName==null || $scope.user.lastName.trim().length<1){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter your lastname."); 
      return;
    } 

    if($scope.user.unitNo==null || $scope.user.unitNo.trim().length<1){
     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter your home number."); 
     return; 
    } else {
      $scope.user.unitNo=$scope.user.unitNo.replace(/unit/gi,'').trim();
    }

    // Set consolidated home number based on block and other criterias;
    if($scope.communityInfo.multiBlock==true) {
      if($scope.user.blockNo==null || $scope.user.blockNo.trim().length<1) {
       $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter your block number."); 
       return; 
      } else {
        $scope.user.blockNo=$scope.user.blockNo.replace(/block/gi,'').trim();
      }
    } 

    if($scope.user.phoneNum==null || $scope.user.phoneNum.trim().length!=10){
     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter your 10 digit phone number."); 
     return; 
    }

    $ionicLoading.show(SettingsService.getLoadingMessage("Registering your community"));      
    AccountService.setYourInfo($scope.user);
    AccountService.createNewCommunity().then(function(regionData){
      AccountService.createNewCommunityAdmin(regionData).then(function(userData){
        AccountService.addHome({
          blockNo: $scope.user.blockNo,
          unitNo: $scope.user.unitNo, 
          residency: regionData.get("uniqueName")
        });
        AccountService.createUserResidency(userData);
        $scope.completeSettingUpCommunity(regionData, userData);
      },function(error){
        if(error.code==202) {
          AccountService.getUserObjectByPhoneNumber($scope.user.phoneNum).then(function(user){
            AccountService.createUserResidencyForAdmin($scope.user, user, regionData).then(function(userResidency){
              Parse.User.logIn(user.getUsername(), "custom", {
                success: function(user) {
                  AccountService.addHome({
                    blockNo: $scope.user.blockNo,
                    unitNo: $scope.user.unitNo, 
                    residency: regionData.get("uniqueName")
                  });
                  AccountService.updateUserForNewCommunity(user, userResidency);
                  $scope.completeSettingUpCommunity(regionData, user);
                },
                error: function(user, error) {
                  $scope.handleRegistrationError(regionData, error, "Unable to sign you up because of inability to log you in ");
                }
              });
            },function(error){
              $scope.handleRegistrationError(regionData, error, "Unable to sign you up because of inability to create user residency ");              
            });            
          },function(error){
            $scope.handleRegistrationError(regionData, error, "Unable to sign you up because of phone number not found ");            
          });
        } else {
          $scope.handleRegistrationError(regionData, error, "Unable to sign you up because of error code is not 202 ");          
        }            
      });
    },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to setup your community.");
        $ionicLoading.hide();
        LogService.log({type:"ERROR", message: "Unable to setup your community  " + JSON.stringify(error) + " data : " + JSON.stringify(AccountService.getCommunityAddress()) }); 
    });
  
  };

  $scope.handleRegistrationError=function(regionData, error, debugMessage) {
    regionData.destroy();
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to sign you up for the service.");
    $ionicLoading.hide();
    LogService.log({type:"ERROR", message: debugMessage + JSON.stringify(error) + " data : " + JSON.stringify(AccountService.getYourInfo()) });           
  };

  $scope.sendRegisteredEmail=function(region, user) {
    var message="Here are details of new community...\n\n"
    message+="Name : " + region.get("name") + "\n";
    var addressList=region.get("execOffAddrList");
    if(addressList!=null && addressList.length>0) {
      var communityAddress=addressList[0];
      message+="Address Line 1 : " + communityAddress.addressLine1  + "\n";
      message+="City : " + communityAddress.city  + "\n\n";      
    }
    message+="Admin Name : " + user.get("firstName") + " " + user.get("lastName")  + "\n";
    message+="Phone Number : " + user.get("username")  + "\n";
    console.log("Message : " + message);
    NotificationService.sendEmail("", "", "New Community Registered", message);
  }

  $scope.cancel=function() {
    $state.go("community-info");
  };

  $scope.completeSettingUpCommunity=function(regionData, userData){
    LogService.log({type:"INFO", message: "Setup of community and user is complete  " + " data : " + JSON.stringify(AccountService.getYourInfo()) });           
    RegionService.initializeRegionCache(regionData);          
    NotificationService.registerDevice();
    LogService.log({type:"INFO", message: "Device registered during community setup  " + " data : " + JSON.stringify(AccountService.getYourInfo()) });                   
    ActivityService.postWelcomeActivity(regionData, userData);          
    SettingsService.setAppSuccessMessage("Community has been registered.");
    $scope.sendRegisteredEmail(regionData, userData);    
    $ionicLoading.hide();
    $state.go("tab.region");
  }
})


.controller('InviteCitizenCtrl', function($scope, $state, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService, $ionicHistory, $ionicLoading) {
  SettingsService.trackView("Invite citizen controller");            
  $scope.user={
    status:"P", 
    homeOwner: true,
    pageTransitionData: false
  };
  $scope.communityHomesLoadError=false;
  $scope.regionSettings=RegionService.getRegionSettings(Parse.User.current().get("residency"));
  $scope.countryList=COUNTRY_LIST;
  $scope.user.country=$scope.countryList[0];    

  var pageTransitionData=SettingsService.getPageTransitionData();
  console.log("Page transition data : " + JSON.stringify(pageTransitionData));
  if(pageTransitionData!=null) {
    $scope.user.homeNumber=pageTransitionData.homeNo;
    $scope.user.pageTransitionData=true;
  } else if($scope.regionSettings.supportHomeNumber==true){
    $ionicLoading.show(SettingsService.getLoadingMessage("Loading community homes"));      
    AccountService.getListOfHomesInCommunity(AccountService.getUserResidency()).then(function(homesList) {
      if(homesList!=null && homesList.length>0) {
        $scope.availableHomes=homesList;      
        $scope.user.dropDownHome=$scope.availableHomes[0];    
      } else {
        $scope.communityHomesLoadError=true;
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Homes have not been added to the community. Please request board members to add the homes in this community to invite residents.");      
      }
      $ionicLoading.hide();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Unable to get community home numbers.");      
      $ionicLoading.hide();
    });      
  }

  $scope.invite=function() {
    SettingsService.trackEvent("Account", "InviteResident");
    if($scope.user.firstName==null || $scope.user.firstName.trim().length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first name.");
      return;
    } 

    if($scope.user.lastName==null || $scope.user.lastName.trim().length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter last name.");
      return;
    } 
    
    if ($scope.user.phoneNum!=null) {
      var formattedPhone = $scope.user.phoneNum.replace(/[^0-9]/g, '');  

      if(formattedPhone.length>=10 && formattedPhone.length<=12) { 
        if(formattedPhone.length>10) {
          formattedPhone=formattedPhone.substr(formattedPhone.length-10, 10);
        } 
        $scope.user.phoneNum=formattedPhone;
      } else {
         $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter 10 digit phone number");
         return;        
      }
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter phone number");
      return;
    }
      
    if($scope.user.pageTransitionData==false && $scope.regionSettings.supportHomeNumber==true) {
      $scope.user.homeNumber=$scope.user.dropDownHome.value;
    }

    if($scope.regionSettings.supportMultiCountry==true) {
      $scope.user.countryCode=$scope.user.country.countryCode;
    } else {
      $scope.user.countryCode=AccountService.getUser().get("countryCode");
    }

    console.log("Invited " + JSON.stringify($scope.user));
    $ionicLoading.show(SettingsService.getLoadingMessage("Inviting the resident"));      
    // Create user
    AccountService.addInvitedContact($scope.user).then(function(newUser) {
      // Send invitation
      AccountService.createUserResidency(newUser).then(function(userResidency){
        completeUserResidencyCreation(newUser);
        console.log("user residency has been created.");
        SettingsService.setAppSuccessMessage("Invitation has been sent to the resident.");
        $ionicLoading.hide();
        $ionicHistory.goBack(-1);
      },function(error){
        LogService.log({type:"ERROR", message: "Unable to add resident in this community " + JSON.stringify(error)});       
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add resident in this community.");            
        $ionicLoading.hide();
      });
    }, function(error) {
      LogService.log({type:"ERROR", message: "Unable to insert user record " + JSON.stringify(error)});       
      if(error.code==202) {
        console.log("User phone number " + $scope.user.phoneNum);
        AccountService.getUserObjectByPhoneNumber($scope.user.phoneNum).then(function(user){
          console.log("Found the user");
          AccountService.getUserResidenciesOfSpecificResidency(user, AccountService.getUserResidency()).then(function(userResidency){
            console.log("Queried user residency " + userResidency);
            if(userResidency==null){
              console.log("Resident will be added to this community");
              AccountService.createUserResidencyWhenUserExists($scope.user, user).then(function(userResidency){
                console.log("User residency has been created for existing user.");
                completeUserResidencyCreation(user);
                SettingsService.setAppSuccessMessage("Invitation has been sent to the resident.");
                $ionicLoading.hide();                
                $ionicHistory.goBack(-1);
              },function(error){
                LogService.log({type:"ERROR", message: "Unable to add resident in this community " + JSON.stringify(error)});       
                $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add resident in this community.");            
                $ionicLoading.hide();
              });
            } else {
              $scope.controllerMessage=SettingsService.getControllerErrorMessage("Resident is already part of this community.");            
              $ionicLoading.hide();
            }
          },function(error){
            LogService.log({type:"ERROR", message: "Unable to get this resident communities " + JSON.stringify(error)});       
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get this resident communities.");  
            $ionicLoading.hide();
          });
        },function(error){
          LogService.log({type:"ERROR", message: "Unable to find this resident " + JSON.stringify(error)});       
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find this resident.");  
          $ionicLoading.hide();
        });        
      } else {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to invite this resident.");  
        $ionicLoading.hide();
      }
    });
  
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

  var completeUserResidencyCreation=function(newUser){
    RegionService.getRegion(AccountService.getUserResidency()).then(function(region){
      NotificationService.sendInvitationCodeV2("invitation", newUser.get("username"), region.get("name"), "");
    }, function(error){          
      LogService.log({type:"ERROR", message: "Unable to get region to send SMS " + JSON.stringify(error)}); 
      NotificationService.sendInvitationCodeV2("invitation", newUser.get("username"), "", "");
    });
  };
/**
{"id":"1","rawId":"1","displayName":"Plumber","name":{"familyName":"Doe","givenName":"Jane","formatted":"Jane Doe"},"nickname":"Plumber","phoneNumbers":[{"id":"2","pref":false,"value":"212-555-1234","type":"work"},{"id":"3","pref":false,"value":"917-555-5432","type":"mobile"},{"id":"4","pref":false,"value":"203-555-7890","type":"home"}],"emails":null,"addresses":null,"ims":null,"organizations":null,"birthday":null,"note":null,"photos":null,"categories":null,"urls":null}
*/
  $scope.pickContact=function() {
    console.log("About to pickup service contact");
    SettingsService.trackEvent("Account", "PickContact");
    $cordovaContacts.pickContact().then(function (contactPicked) {
      console.log("Contact picked  : " + JSON.stringify($scope.contact));      
      if(contactPicked.name!=null) {
        if(contactPicked.name.givenName!=null) {
          $scope.user.firstName=contactPicked.name.givenName;
        } 
        if(contactPicked.name.familyName!=null) {
          $scope.user.lastName=contactPicked.name.familyName;
        }
      }

      if($scope.user.firstName==null && $scope.user.lastName==null) {
        $scope.user.firstName=contactPicked.displayName;
      }

      if(contactPicked.phoneNumbers!=null && contactPicked.phoneNumbers.length>0) {
        var phoneNum=null;
        for(var i=0;i<contactPicked.phoneNumbers.length;i++) {
          if(contactPicked.phoneNumbers[i].type=="mobile") {
            phoneNum=contactPicked.phoneNumbers[i].value;
            break;
          }
        }
        if(phoneNum==null) {
          phoneNum=contactPicked.phoneNumbers[0].value;
        }
        $scope.user.phoneNum=phoneNum;
      }
    });
  };

  $scope.saveContact=function() {
  // create a new contact object
  var contact = navigator.contacts.create();
  contact.displayName = "Plumber";
  contact.nickname = "Plumber";            // specify both to support all devices
  // populate some fields
  var name = new ContactName();
  name.givenName = "Jane";
  name.familyName = "Doe";
  contact.name = name;
  // store contact phone numbers in ContactField[]
  var phoneNumbers = [];
  phoneNumbers[0] = new ContactField('work', '212-555-1234', false);
  phoneNumbers[1] = new ContactField('mobile', '917-555-5432', true); // preferred number
  phoneNumbers[2] = new ContactField('home', '203-555-7890', false);
  contact.phoneNumbers = phoneNumbers;
  // save to device
  contact.save(function onSuccess(contact) {
        console.log("Save Success " + JSON.stringify(contact));
    },function onError(contactError) {
        console.log("Error = " + JSON.stringify(contactError.code));
    });
  };

})

.controller('DocumentProofListCtrl', function($scope, $stateParams, $state, AccountService, SettingsService, $ionicHistory, $cordovaDialogs, $ionicLoading, PictureManagerService) {
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading proof documents..."));  
  SettingsService.trackView("Document proof list controller");        
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.homeNo=$stateParams.homeNo;

  AccountService.getHomeByHomeNo($stateParams.homeNo).then(function(home) {
    $scope.home=home;
    $scope.docList=$scope.home.get("proofDocList");    

    var stateData=PictureManagerService.getState();
    if(stateData.imageUrl!=null) {
      var doc={
        url: stateData.imageUrl,
        name: ""
      };
      if($scope.docList!=null && $scope.docList.length>0) {
        $scope.docList.push(doc);
      } else {
        $scope.docList=[doc];
      }
      $scope.home.set("proofDocList", $scope.docList);
      $scope.home.save();
      PictureManagerService.reset();
    }

    if($scope.docList==null || $scope.docList.length==0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("You have not uploaded any proof documents.");
    }    
    $ionicLoading.hide();
  }, function(error) {
    LogService.log({type:"ERROR", message: "Unable to retrieve proof documents : " + JSON.stringify(error)});       
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get proof documents. Check your internet connection.");  
    $ionicLoading.hide();
  });  

  $scope.gotoProofUpload=function() {
    SettingsService.trackEvent("Account", "UploadProofDocuments");        
    PictureManagerService.reset();
    PictureManagerService.setFromPage("tab.account-proof-docs");
    PictureManagerService.setFromPagePathParamValue({homeNo: $stateParams.homeNo});
    $state.go("tab.account-picman");        
  };

  $scope.deleteProof=function(index) {
    $cordovaDialogs.confirm('Do you want to delete this proof?', 'Delete Proof', ['Delete','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        SettingsService.trackEvent("Account", "DeleteProof");
        $ionicLoading.show(SettingsService.getLoadingMessage("Deleting proof document")); 
        $scope.docList.splice(index, 1); 
        $scope.home.set("proofDocList", $scope.docList);
        $scope.home.save().then(function(updatedHome){
          $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Deleted proof document.");
          $ionicLoading.hide();
        }, function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete proof document.");
          $ionicLoading.hide();
        });    
      } else {
        console.log("Canceled deletion of proof document");
      }
    });
  };

  $scope.showProofDocument=function(index) {
    console.log("Will show the proof in modal");
  };

})

.controller('VehicleListCtrl', function($scope, $stateParams, $state, AccountService, SettingsService, $ionicHistory, $cordovaDialogs, $ionicLoading) {
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading vehicle information"));  
  SettingsService.trackView("Vehicle list controller");        
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.homeNo=$stateParams.homeNo;

  AccountService.getHomeByHomeNo($stateParams.homeNo).then(function(home) {
    $scope.vehicleList=home.get("vehicleList");
    if($scope.vehicleList==null || $scope.vehicleList.length==0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("You have not registered any vehicles in this community.");
    }    
    $ionicLoading.hide();
  }, function(error) {
    LogService.log({type:"ERROR", message: "Unable to get vehicle details : " + JSON.stringify(error)});       
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get vehicle details. Check your internet connection.");  
    $ionicLoading.hide();
  });  

})

.controller('VehicleAddCtrl', function($scope, $stateParams, $state, AccountService, SettingsService, $ionicHistory, $ionicLoading) {
  SettingsService.trackView("Vehicle add controller");        
  $scope.canAddCommunityRegNumber=AccountService.canUpdateRegion();
  $scope.ideaMessage=SettingsService.getControllerInfoMessage("Add your vehicle information. Board will update community registration number to this vehicle.");
  $scope.vehicle={
    type: 2,
    licensePlate: "",
    communityRegNumber: "",
    model: "",
    color: ""
  };

  $scope.addVehicle=function() {
    SettingsService.trackEvent("Account", "VehicleAdd");
    $ionicLoading.show(SettingsService.getLoadingMessage("Adding vehicle to your home")); 
    AccountService.getHomeByHomeNo($stateParams.homeNo).then(function(home){
      AccountService.addVehicleToUser(home, $scope.vehicle).then(function(updatedHome) {
        SettingsService.setAppSuccessMessage("Vehicle has been added.");
        $ionicLoading.hide();
        $ionicHistory.goBack(-1);
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add vehicle");
        $ionicLoading.hide();
      });    
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get your residency details.");
      $ionicLoading.hide();
    });
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);      
  };
  
})

.controller('VehicleUpdateCtrl', function($scope, $stateParams, $state, AccountService, SettingsService, $ionicHistory, $cordovaDialogs, $ionicLoading) {
  SettingsService.trackView("Vehicle update controller");        
  $scope.canAddCommunityRegNumber=AccountService.canUpdateRegion();

  AccountService.getHomeByHomeNo($stateParams.homeNo).then(function(home){    
    $scope.home=home;
    var targetVehicle=home.get("vehicleList")[$stateParams.vehicleIndex];
    console.log("Target vehicle " + JSON.stringify(targetVehicle));
    $scope.vehicle={
      type: targetVehicle.type,
      licensePlate: targetVehicle.licensePlate,
      communityRegNumber: targetVehicle.communityRegNumber,
      model: targetVehicle.model,
      color: targetVehicle.color
    };
  }, function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get your vehicle details.");
  });

  $scope.updateVehicle=function() {
    SettingsService.trackEvent("Account", "VehicleUpdate");
    $ionicLoading.show(SettingsService.getLoadingMessage("Updating vehicle information")); 
    var currentVehicleList=$scope.home.get("vehicleList");
    currentVehicleList.splice($stateParams.vehicleIndex, 1); 
    currentVehicleList.unshift($scope.vehicle);
    $scope.home.set("vehicleList", currentVehicleList);
    $scope.home.save().then(function(updatedHome){
      SettingsService.setAppSuccessMessage("Updated your vehicle information.");
      $ionicLoading.hide();
      $ionicHistory.goBack(-1);      
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete the vehicle.");
      $ionicLoading.hide();
    });    
  };

  $scope.deleteVehicle=function() {
    $cordovaDialogs.confirm('Do you want to remove this vehicle?', 'Remove Vehicle', ['Remove','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        SettingsService.trackEvent("Account", "VehicleRemove");
        $ionicLoading.show(SettingsService.getLoadingMessage("Deleting vehicle information")); 
        var currentVehicleList=$scope.home.get("vehicleList");
        currentVehicleList.splice($stateParams.vehicleIndex, 1); 
        $scope.home.set("vehicleList", currentVehicleList);
        $scope.home.save().then(function(updatedHome){
          SettingsService.setAppSuccessMessage("Removed your registered vehicle.");
          $ionicLoading.hide();
          $ionicHistory.goBack(-1);      
        }, function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete the vehicle.");
          $ionicLoading.hide();
        });    
      } else {
        console.log("Canceled removal of vehicle");
      }
    });
  };  

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);      
  };
  
})


;
