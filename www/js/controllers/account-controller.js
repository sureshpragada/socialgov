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
1  };

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

.controller('AccountCtrl', function($scope, $state, RegionService, LogService, AccountService, NotificationService, SettingsService, $ionicModal, PictureManagerService) {
  $scope.user = AccountService.getUser();
  $scope.settings={notifications: $scope.user.get("notifySetting")}; 
  $scope.privs={
    isSuperAdmin: AccountService.isSuperAdmin(), 
    isCitizen: AccountService.isCitizen(),
    isLogoutAllowed: AccountService.isLogoutAllowed($scope.user)
  };

  $scope.appMessage=SettingsService.getAppMessage();  

  $scope.isPendingRequest=false;
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
  }, function() {
    $scope.accessRequestMessage=SettingsService.getControllerErrorMessage("Unable to retrieve status of your role change request.");
  });

  RegionService.getRegion($scope.user.get("residency")).then(function(region){
    $scope.regionDisplayName=region.get("name");
  }, function() {
    $scope.regionDisplayName=user.get("residency");
  });

  $scope.getRoleNameFromRoleCode=function(role) {
    return AccountService.getRoleNameFromRoleCode(role);
  };

  $scope.registerDevice=function() {
    console.log("Registering device");
    NotificationService.registerDevice();
  };

  $scope.logout=function() {    
    Parse.User.logOut();
    $scope.user=null;
    $state.go("invite-login");      
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

  var stateData=PictureManagerService.getState();
  if(stateData.imageUrl!=null) {
    var images=Parse.User.current().get("images");
    if(images!=null && images.length>0) {
      images.unshift(stateData.imageUrl);
    } else {
      images=[stateData.imageUrl];
    }
    Parse.User.current().set("images", images);
    Parse.User.current().save();
    PictureManagerService.reset();
  }

  $scope.uploadProfilePicture=function() {
    PictureManagerService.reset();
    PictureManagerService.setFromPage("tab.account");
    $state.go("tab.account-picman");
  };

})

.controller('AccountUpdateCtrl', function($scope, $state, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService) {
  console.log("Account update controller");

  var user=Parse.User.current();
  $scope.inputUser={
    firstName: user.get("firstName"), 
    lastName: user.get("lastName"),
    homeNumber: user.get("homeNo")
  };
  $scope.regionSettings=RegionService.getRegionSettings(Parse.User.current().get("residency"));  

  $scope.update=function() {
    console.log("Update request " + JSON.stringify($scope.inputUser));

    if($scope.regionSettings.supportHomeNumber==true) {
      if($scope.inputUser.homeNumber==null || $scope.inputUser.homeNumber.length<=0) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home, unit or apt number.");
        return;
      }       
    }    

    if($scope.inputUser.firstName==null || $scope.inputUser.lastName==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first and last name.");
    } else {
      AccountService.updateAccount($scope.inputUser).then(function(newUser) {
        SettingsService.setAppSuccessMessage("Account update is successfull.");
        $state.go("tab.account");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update your account.");  
      });
    }
  };

})

.controller('InvitationLoginCtrl', function($scope, $state, RegionService, LogService, AccountService, $cordovaDialogs, SettingsService, NotificationService, $http) {
  $scope.inputForm={invitationCode: null, terms: true};
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.validateInvitationCode=function() {
    console.log("Validating invitation code");
    if($scope.inputForm.invitationCode!=null && $scope.inputForm.invitationCode.length>0) {
      AccountService.validateInvitationCode($scope.inputForm.invitationCode).then(function(user) {
        NotificationService.registerDevice();
        $state.go("tab.dash");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage(error.message);  
      });  
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter invitation code.");
    }
  };

  $scope.requestInvitationCode=function() {
    console.log("Validating invitation code");
    $state.go("request-invitation");
  };  

  $scope.showTerms=function() {    
    $http.get("img/license.txt")
      .success(function(data) {
        $cordovaDialogs.alert(data, 'Terms & Conditions');
      }).error(function() {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to read license content");
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


.controller('InviteCitizenCtrl', function($scope, $state, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService) {
  console.log("Invite citizen controller");
  $scope.user={status:"P"};
  $scope.regionSettings=RegionService.getRegionSettings(Parse.User.current().get("residency"));

  $scope.invite=function() {
    console.log("invited " + JSON.stringify($scope.user));
    if($scope.user.firstName==null || $scope.user.lastName==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first and last name.");
      return;
    } 

    if($scope.regionSettings.supportHomeNumber==true) {
      if($scope.user.homeNumber==null || $scope.user.homeNumber.length<=0) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home, unit or apt number.");
        return;
      }       
    }    
    
    if ($scope.user.phoneNum!=null) {
      var formattedPhone = $scope.user.phoneNum.replace(/[^0-9]/g, '');  

      if(formattedPhone.length != 10) { 
         $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter 10 digit phone number");
         return;
      } 
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter phone number");
      return;
    }
      
    // Create user
    AccountService.addInvitedContact($scope.user).then(function(newUser) {
      // Send invitation
      NotificationService.sendInvitationCode(newUser.id, newUser.get("username"));
      SettingsService.setAppSuccessMessage("Invitation has been sent.");
      $state.go("tab.account");
    }, function(error) {
      // Verify if this user exist message
      if(error.code==202) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Contact already have invitation.");  
      } else {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to invite this contact.");  
      }
      $scope.$apply();
    });

  };

/**
{"id":"1","rawId":"1","displayName":"Plumber","name":{"familyName":"Doe","givenName":"Jane","formatted":"Jane Doe"},"nickname":"Plumber","phoneNumbers":[{"id":"2","pref":false,"value":"212-555-1234","type":"work"},{"id":"3","pref":false,"value":"917-555-5432","type":"mobile"},{"id":"4","pref":false,"value":"203-555-7890","type":"home"}],"emails":null,"addresses":null,"ims":null,"organizations":null,"birthday":null,"note":null,"photos":null,"categories":null,"urls":null}
*/
  $scope.pickContact=function() {
    console.log("About to pickup service contact");
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

});
