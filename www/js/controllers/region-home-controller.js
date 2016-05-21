angular.module('starter.controllers')

.controller('RegionHomesCtrl', function($scope, $state, $q, $stateParams, AccountService, SettingsService, $ionicLoading) {
  SettingsService.trackView("Region homes controller");    
  $ionicLoading.show(SettingsService.getLoadingMessage("Listing your homes"));
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.control={
    requestedSearch: true,
    searchStr: ""
  };

  $q.all([
    AccountService.getAllHomes(AccountService.getUserResidency()),
    AccountService.getResidentsInCommunity(AccountService.getUserResidency())
  ]).then(function(results){
    var homes=results[0];
    var residents=results[1];
    $scope.homeList=[];    
    for(var i=0;i<homes.length;i++) {
      var residentCount=0, homeOwnerCount=0, tenantCount=0;
      var searchString=homes[i].get("homeNo");
      console.log("Residents length " + residents.length);
      for(var j=0;j<residents.length;j++) {  
        // console.log("Resident : " + JSON.stringify(residents[j]));
        if(homes[i].get("homeNo")==residents[j].get("homeNo")) {
          residentCount++;
          if(residents[j].get("homeOwner")==true) {
            homeOwnerCount++;
          } else {
            tenantCount++;
          }
          searchString=searchString + " " + residents[j].get("user").get("firstName") + " " + residents[j].get("user").get("lastName") + " " + residents[j].get("user").get("bloodGroup");
        }
      }
      $scope.homeList.push({
        homeNo: homes[i].get("homeNo"),
        noOfResidents: residentCount, 
        noOfHomeOwners: homeOwnerCount,
        noOfTenants: tenantCount,
        search: searchString
      });
    }
    if($scope.homeList.length<2) {
      $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Enter home numbers to get started on financials and then you can invite neighbors.");
    }
    $ionicLoading.hide();    
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get homes in community.");
    $ionicLoading.hide();
  });

})

.controller('HomeDetailCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading, $ionicHistory, RegionService) {
  SettingsService.trackView("Home detail controller ");    
  $ionicLoading.show(SettingsService.getLoadingMessage("Listing home residents"));
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());      
  $scope.homeNo=$stateParams.homeNo;
  $scope.appMessage=SettingsService.getAppMessage();    
  AccountService.getResidentsOfHome(AccountService.getUserResidency(), $stateParams.homeNo).then(function(neighborList) {
    $scope.neighborList=neighborList;
    if($scope.neighborList.length==0) {
      $scope.residentsNotAvailableMessage=SettingsService.getControllerInfoMessage("Residents have not been invited in to this home. ");
      //Invite residents of this home to collaborate and manage their financials.
    } else {
      $scope.homeOwnerList=[];
      $scope.tenantList=[];
      for(var i=0;i<$scope.neighborList.length;i++) {
        if($scope.neighborList[i].get("homeOwner")==true) {
          $scope.homeOwnerList.push($scope.neighborList[i]);
        } else {
          $scope.tenantList.push($scope.neighborList[i]);
        }
      }
    }
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get residents in this home.");
    $ionicLoading.hide();
  });

  $scope.gotoInvite=function() {
    SettingsService.setPageTransitionData({
      homeNo: $stateParams.homeNo      
    });
    $state.go("tab.invite-citizen");          
  };

  $scope.editHome=function() {
    $state.go("tab.edit-home", {homeNo: $stateParams.homeNo});            
  };

  $scope.deleteHome=function() {
    SettingsService.trackEvent("Home", "Delete");
    AccountService.getHomeByHomeNo($scope.homeNo).then(function(home){
      home.destroy().then(function(deletedHome){
        SettingsService.setAppSuccessMessage("Home " + $scope.homeNo + " has been deleted from your community.");
        AccountService.refreshHomesCache(AccountService.getUserResidency());        
        $ionicHistory.goBack(-1);
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete home from this community.");
      });
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find home in this community.");
    });    
  };

})


.controller('EditHomeCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading, $ionicHistory) {
  SettingsService.trackView("Edit home controller");
  $ionicLoading.show(SettingsService.getLoadingMessage("Retrieving home details"));
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.input={
    homeNo: $stateParams.homeNo,
    residency: AccountService.getUserResidency()
  };

  AccountService.getAllHomes(AccountService.getUserResidency()).then(function(homes){
    $scope.homeList=homes;
    for(var i=0;i<homes.length;i++) {
      if(homes[i].get("homeNo")==$stateParams.homeNo) {
        $scope.home=homes[i];
        $scope.input.homeNo=$scope.home.get("homeNo");
        break;
      }
    }
    $ionicLoading.hide();    
  }, function(error) {
    $scope.controllerMessage="Unable to retrieve home details.";
    $ionicLoading.hide();    
  });

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

  $scope.editHome=function() {  
    SettingsService.trackEvent("Home", "Edit");  
    // Validate home number for null and duplicates
    if($scope.input.homeNo!=null && $scope.input.homeNo.length>0 && $scope.input.homeNo!=$scope.home.get("homeNo")){      
      for(var i=0;i<$scope.homeList.length;i++) {
        if($scope.input.homeNo==$scope.homeList[i].get("homeNo")) {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Home number exists in the system.");    
          return;
        }         
      }   
      // Update home and resident object
      AccountService.updateHomeNumber($scope.home, $scope.input).then(function(updatedHomeNumber){
        SettingsService.setAppSuccessMessage("Home " + $scope.homeNo + " details have been updated.");
        $ionicHistory.goBack(-2);
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update home number.");
      })
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter new home number.");
    }
  };

})


.controller('AddHomesCtrl', function($scope, $stateParams, $q, AccountService, RegionService, $state, SettingsService, LogService) {
  SettingsService.trackView("Add homes controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());    
  $scope.input={
    homeData: null
  };  

  $scope.submit=function(){
    SettingsService.trackEvent("Home", "Add");
    if($scope.regionSettings.multiBlock==true && ($scope.input.blockNo==null || $scope.input.blockNo.trim().length<1)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter block number of these homes.");
      return;
    }

    if($scope.input.homeData!=null && $scope.input.homeData.length>0){      
      var inputHomes=[];
      var homeLines = $scope.input.homeData.split('\n');
      for(var i=0; i < homeLines.length; i++){
        var homeLine = homeLines[i].split(',');
        for(var j=0;j<homeLine.length;j++) {
          // replace(/\s+/g, '')  -- Remove only spaces leaving - or anything   
          // $scope.user.homeNumber=$scope.user.homeNumber.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');          
          if(homeLine[j]!=null && homeLine[j].trim().length>0) {
            var multiHomeNumbers=$scope.getAllHomeNUmbers(homeLine[j].trim());
            if(multiHomeNumbers.length>0) {
              for(var k=0;k<multiHomeNumbers.length;k++) {
                inputHomes.push(multiHomeNumbers[k].trim().toUpperCase().replace(/[^0-9A-Z]/g, ''));
              }
            } else {
              inputHomes.push(homeLine[j].trim().toUpperCase().replace(/[^0-9A-Z]/g, ''));            
            }
          } else {
            console.log("Skipping.. Invalid home number " + homeLine[j]);
          }          
        }
      }
      console.log("Input homes " + JSON.stringify(inputHomes));
      inputHomes=inputHomes.removeDuplicates();
      console.log("Removed duplicates 1 " + JSON.stringify(inputHomes));      
      AccountService.getAllHomes(AccountService.getUserResidency()).then(function(existingHomes){
        for(var i=0;i<existingHomes.length;i++) {
          if($scope.regionSettings.multiBlock==true && existingHomes[i].get("blockNo")==$scope.input.blockNo && 
              inputHomes.indexOf(existingHomes[i].get("unitNo"))) {
                inputHomes.splice(index, 1);
          } else if($scope.regionSettings.multiBlock==false && inputHomes.indexOf(existingHomes[i].get("unitNo"))!=-1) {
              inputHomes.splice(index, 1);
          } 
        }
        console.log("Removed duplicates 2 " + JSON.stringify(inputHomes));      
        if(inputHomes.length>0) {
          $scope.addHomes(inputHomes);            
        } else {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Home numbers are exists in your community.");  
        }        
      }, function(error){
        console.log("Error while finding existing homes : " + JSON.stringify(error));
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get existing home list to filter duplicate entries from your list.");
      });
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter home numbers in your community. Please separate them by comma to enter multiple numbers.");
    }
  };

  $scope.addHomes=function(finalHomeList) {
    AccountService.addHomes(AccountService.getUserResidency(), finalHomeList, $scope.input.blockNo).then(function(newHomes){
      console.log("new homes " + JSON.stringify(newHomes));
      if(newHomes.length>1) {
        SettingsService.setAppSuccessMessage(newHomes.length + " homes have been added to community.");
      } else {
        SettingsService.setAppSuccessMessage("Home has been added to community.");
      }        
      AccountService.refreshHomesCache();
      $state.go("tab.homes");          
    },function(error){
      SettingsService.setAppInfoMessage("Unable to add home(s) in your community. " + JSON.stringify(error));
      AccountService.refreshHomesCache();
      $state.go("tab.homes");          
    });
  };

  $scope.getAllHomeNUmbers=function(inputStr) {
    var homeNumbers=[];    
    var splitArray=inputStr.split(':');
    if(splitArray.length==2) {
      var num1=parseInt($scope.getNumber(splitArray[0]));
      var num2=parseInt($scope.getNumber(splitArray[1]));
      var baseHomeStr = splitArray[0].substring(0, splitArray[0].lastIndexOf(num1.toString()));
      for(var i=num1;i<=num2;i++) {
        homeNumbers.push(baseHomeStr+i.toString());
      }
    } 
    return homeNumbers;    
  };

  $scope.getNumber=function(input){
    var numsInInput=input.match(/[0-9]+/g);
    return numsInInput[numsInInput.length-1];
  };
    
  $scope.cancel=function(){
    $state.go("tab.homes");          
  };

})

.controller('UploadNeighborsCtrl', function($scope, $stateParams, $q, AccountService, RegionService, $state, SettingsService, LogService) {
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.input={
    neighborData: null
  };

  $scope.submit=function(){
    if($scope.input.regionName==null || $scope.input.regionName.length<1){      
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter region unique name.");
      return;
    }

    if($scope.input.neighborData!=null && $scope.input.neighborData.length>0){      
      var neighborLines = $scope.input.neighborData.split('\n');
      var userPromises=[];
      for(var i=0; i < neighborLines.length; i++){
        var neighborLine = neighborLines[i].split(',');
        console.log(JSON.stringify(neighborLine));

        var newUser=new Parse.User();
        newUser.set("username", "91"+neighborLine[3]);
        newUser.set("password", "custom");
        newUser.set("residency", $scope.input.regionName);
        newUser.set("firstName", neighborLine[1].length>0?neighborLine[1]:neighborLine[0]);
        newUser.set("lastName", neighborLine[2].length>0?neighborLine[2]:neighborLine[0]);
        newUser.set("phoneNum", neighborLine[3]);
        newUser.set("countryCode", "91");
        newUser.set("role", "CTZEN");
        newUser.set("notifySetting", true);
        newUser.set("deviceReg", "N");
        newUser.set("homeOwner", true);
        newUser.set("homeNo", neighborLine[0]);
        newUser.set("status", "P");
        userPromises.push(newUser.save());
      }
      $q.all(userPromises).then(function(results){
        SettingsService.setAppSuccessMessage("Upload of neighbor data is successful.");
        AccountService.refreshResidentCache();
        $state.go("tab.region", {regionUniqueName: "native"});          
      },function(error){
        // console.log("Error creating users " + JSON.stringify(error));
        SettingsService.setAppInfoMessage("Upload of neighbor data is partially failed. Please check neighbors and then adjust the data. " + JSON.stringify(error));
        AccountService.refreshResidentCache();
        $state.go("tab.region", {regionUniqueName: "native"});                    
      });
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter neighbor information in comma separated format");
    }
  };

  $scope.cancel=function(){
    $state.go("tab.region",{regionUniqueName: "native"});          
  };

})

.controller('NeighborDetailCtrl', function($scope, $state, $interval, $stateParams,$cordovaDialogs, AccountService, SettingsService, NotificationService, $ionicActionSheet, $timeout, $cordovaClipboard, $ionicHistory, RegionService, UserResidencyService, $ionicLoading) {
  SettingsService.trackView("Neighbor details controller ");

  $scope.operatingUser=AccountService.getUser();
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.user=null;
  AccountService.getUserById(AccountService.getUserResidency(), $stateParams.userId).then(function(neighbor) {
    // console.log("Got the neighbor " + JSON.stringify(neighbor));
    $scope.userResidency=neighbor;
    $scope.user=neighbor.get("user");        
    $scope.isNeighborAdmin=AccountService.canOtherUserUpdateRegion($scope.user);
  }, function(error) {
    console.log("Unable to retrieve neighbor : " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unbale to retrieve neighbor information.");
  });
  $scope.isAdmin=AccountService.canUpdateRegion();  

  $scope.getRoleNameFromRoleCode=function(role) {
    return AccountService.getRoleNameFromRoleCode(role);
  };

  $scope.removeOnBoard=function() {
    SettingsService.trackEvent("Home", "RemoveOnBoard");
    AccountService.updateRoleAndTitle($scope.user.id, "CTZEN", null).then(function(status){
      // AccountService.refreshResidentCache();
      SettingsService.setAppSuccessMessage("Resident has been removed from board.");
      $ionicHistory.goBack(-1);
      // $state.go("tab.neighbors");        
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to remove this resident from the board.");
    });    
  };

  $scope.appointOnBoard=function() {
    SettingsService.setPageTransitionData($scope.user);
    $state.go("tab.board-appointment");
  };

  $scope.copyInvitationMessage=function() {
    var invitationMessage="You have been invited to OurBlock. Use invitation code, " + $scope.user.id + " to login to the service. Download app at http://tinyurl.com/jb9tfnr";    
    $cordovaClipboard.copy(invitationMessage).then(function () {
      $scope.copyStatusMessage=SettingsService.getControllerInfoMessage("Invitation message has been copied to clipboard.");
      $interval(function(){
        $scope.copyStatusMessage=null;
      }, 5000, 1);
    }, function () {
      $scope.copyStatusMessage=SettingsService.getControllerErrorMessage("Unable to copy invitation message to clipboard.");
    });
  };

  $scope.sendInvitationCode=function() {
    console.log("Sent invitation code");
    RegionService.getRegion(AccountService.getUserResidency()).then(function(region){
      NotificationService.sendInvitationCode($scope.user.id, $scope.user.get("username"), region.get("name"));              
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Invitation code has been sent to neighbor.");      
    }, function(error){
      LogService.log({type:"ERROR", message: "Unable to get region to send SMS 2 " + JSON.stringify(error)}); 
      NotificationService.sendInvitationCode($scope.user.id, $scope.user.get("username"), "");              
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Invitation code has been sent to neighbor.");            
    });            
  };

  $scope.vacateUser=function() {
    $cordovaDialogs.confirm('Do you want to vacate this user?', 'Vacate User', ['Vacate','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        $ionicLoading.show(SettingsService.getLoadingMessage("Vacating resident"));
        UserResidencyService.getCurrentUserResidency($scope.user, AccountService.getUserResidency()).then(function(userResidency){
          if(userResidency!=null && userResidency.length>0) {
            console.log("User residency length is moer than zero");
           UserResidencyService.removeUserResidency(userResidency[0]).then(function(deletedUserResidency) {
             AccountService.refreshResidentCache(AccountService.getUserResidency());
             SettingsService.setAppSuccessMessage("Resident has been vacated from this community.");
             $ionicLoading.hide();
             $ionicHistory.goBack(-1);            
           }, function(error){
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Resident is not available in this community.");
            $ionicLoading.hide();
           });
          } else {
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Resident is not available in this community.");
            $ionicLoading.hide();            
          }
        }, function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find resident in this community.");
          $ionicLoading.hide();
        });
      } else {
        console.log("Canceled vacating user");
      }
    });
  };

})

.controller('NeighborListCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading) {
  SettingsService.trackView("Neighbor list controller");
  $ionicLoading.show(SettingsService.getLoadingMessage("Listing your neighbors"));
  $scope.control={
    requestedSearch: true,
    searchStr: ""
  };  
  $scope.appMessage=SettingsService.getAppMessage();    
  AccountService.getResidentsInCommunity(Parse.User.current().get("residency")).then(function(neighborList) {
    $scope.neighborList=neighborList;
    // TODO :: Filter blocked users from the list
    if($scope.neighborList!=null && $scope.neighborList.length<2) {
      $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Start building your community by inviting other residents.");
    }
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get neighbors details.");
    $ionicLoading.hide();
  });

})

.controller('AdminNeighborUpdateCtrl', function($scope, $state, $stateParams, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService, $ionicLoading) {
  console.log("Admin Neighbor Account update controller");
  $scope.inputUser={};
  $scope.countryList=COUNTRY_LIST;
  $scope.inputUser.country=$scope.countryList[0];        
  $ionicLoading.show(SettingsService.getLoadingMessage("Preparing neighbor data"));
  AccountService.getUserById(AccountService.getUserResidency(), $stateParams.userId).then(function(neighbor) {
    $scope.userResidency=neighbor;
    $scope.user=$scope.userResidency.get("user");
    $scope.inputUser.firstName=$scope.user.get("firstName");
    $scope.inputUser.lastName=$scope.user.get("lastName");
    $scope.inputUser.userId=$scope.user.id;
    $scope.inputUser.phoneNum=$scope.user.get("phoneNum");
    $scope.inputUser.homeOwner=$scope.userResidency.get("homeOwner");
    $scope.inputUser.country=AccountService.getCountryFromCountryList($scope.user.get("countryCode"), $scope.countryList);

    AccountService.getListOfHomesInCommunity(AccountService.getUserResidency()).then(function(homesList) {
      $scope.availableHomes=homesList;      
      $scope.inputUser.home=AccountService.getHomeRecordFromAvailableHomes($scope.availableHomes, $scope.userResidency.get("homeNo"));    
      $ionicLoading.hide();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Unable to get community home numbers.");      
      $ionicLoading.hide();
    });
  }, function(error) {
    console.log("Unable to retrieve neighbor : " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unbale to retrieve neighbor information.");
    $ionicLoading.hide();
  });  
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());  

  $scope.update=function() {
    SettingsService.trackEvent("Home", "NeighborUpdate");
    console.log("Update request " + JSON.stringify($scope.inputUser));

    if($scope.inputUser.firstName==null || $scope.inputUser.firstName.trim().length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first name.");
      return;
    } 

    if($scope.inputUser.lastName==null || $scope.inputUser.lastName.trim().length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter last name.");
      return;
    }     
    
    if ($scope.inputUser.phoneNum!=null) {
      var formattedPhone = $scope.inputUser.phoneNum.replace(/[^0-9]/g, '');  

      if(formattedPhone.length != 10) { 
         $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter 10 digit phone number");
         return;
      } else {
        $scope.inputUser.phoneNum=formattedPhone;
      }
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter phone number");
      return;
    }

    // if($scope.regionSettings.supportHomeNumber==true) {
    //   if($scope.inputUser.homeNo==null || $scope.inputUser.homeNo.length<=0) {
    //     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home, unit or apt number.");
    //     return;
    //   } else {
    //     $scope.inputUser.homeNo=$scope.inputUser.homeNo.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    //   }
    // }    

    AccountService.updateNeighborAccount($scope.inputUser, $scope.user, $scope.userResidency).then(function(newUser) {
      SettingsService.setAppSuccessMessage("Neighbor information update is successful.");
      $state.go("tab.neighbor-detail", {userId: $scope.user.id});
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update neighbor information.");  
    });
  };
})
;
