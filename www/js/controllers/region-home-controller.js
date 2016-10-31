angular.module('starter.controllers')

.controller('RegionHomesCtrl', function($scope, $state, $q, $stateParams, AccountService, SettingsService, $ionicLoading, RegionService) {
  SettingsService.trackView("Region homes controller");    
  var blockNo=$stateParams.blockNo;
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
        if(blockNo!=null && blockNo!="" && homes[i].get("blockNo")!=blockNo) {
          continue;
        }
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
          search: searchString,
          noOfBedRooms: homes[i].get("noOfBedRooms"),
          noOfSqFt: homes[i].get("noOfSqFt")
        });        
      }
      if($scope.homeList.length<2) {
        $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Enter home details to invite residents and get started on financials.");
      }
      $ionicLoading.hide();          
    }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get homes in community.");
    $ionicLoading.hide();
  });

})


.controller('RegionBlocksCtrl', function($scope, $state, $q, $stateParams, AccountService, SettingsService, $ionicLoading, RegionService ) {
  SettingsService.trackView("Region blocks controller");    

  $ionicLoading.show(SettingsService.getLoadingMessage("Listing your blocks"));
  AccountService.getAllHomes(AccountService.getUserResidency()).then(function(homes){
    $scope.uniqueBlocks=AccountService.getUniqueBlocks(homes);
    $ionicLoading.hide();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get blocks in community.");
    $ionicLoading.hide();
  });

})

.controller('HomeDetailCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading, $ionicHistory, RegionService) {
  SettingsService.trackView("Home detail controller ");    
  $ionicLoading.show(SettingsService.getLoadingMessage("Listing home residents"));
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());      
  $scope.homeNo=$stateParams.homeNo; 
  $scope.appMessage=SettingsService.getAppMessage();    

  AccountService.getHomeByHomeNo($stateParams.homeNo).then(function(home){
    $scope.home=home;
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get details of this home.");
  });

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
    $scope.home.destroy().then(function(deletedHome){
      SettingsService.setAppSuccessMessage("Home " + $scope.home.get("homeNo") + " has been deleted from your community.");
      AccountService.refreshHomesCache(AccountService.getUserResidency());        
      $ionicHistory.goBack(-1);
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete home from this community.");
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
        $scope.input.noOfSqFt=$scope.home.get("noOfSqFt");
        $scope.input.noOfBedRooms=$scope.home.get("noOfBedRooms");
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
    if($scope.input.homeNo!=null && $scope.input.homeNo.length>0){      
      if($scope.input.homeNo!=$scope.home.get("homeNo")) {
        for(var i=0;i<$scope.homeList.length;i++) {
          if($scope.input.homeNo==$scope.homeList[i].get("homeNo")) {
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Home number exists in the system.");    
            return;
          }         
        }  
        $scope.input.homeNumberChanged=true;  
      } else {
        $scope.input.homeNumberChanged=false;  
      }
      // Update home and resident object
      AccountService.updateHomeNumber($scope.home, $scope.input).then(function(updatedHomeNumber){
        SettingsService.setAppSuccessMessage("Home " + $scope.input.homeNo + " details have been updated.");
        $ionicHistory.goBack(-2);
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update home number.");
      })
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter home number.");
    }
  };

})


.controller('AddHomesCtrl', function($scope, $stateParams, $q, AccountService, RegionService, $state, SettingsService, LogService) {
  SettingsService.trackView("Add homes controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());    
  $scope.input={
    homeData: null, 
    noOfBedRooms: null,
    noOfSqFt: null
  };  

  $scope.submit=function(){
    SettingsService.trackEvent("Home", "Add");
    if($scope.regionSettings.multiBlock==true) {
      if($scope.input.blockNo==null || $scope.input.blockNo.trim().length<1) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter block number of these homes.");
        return;
      } else {
        $scope.input.blockNo=$scope.input.blockNo.replace(/block/gi,'').trim();
      }
    } 

    // Validate sq ft and bed rooms if they are mandatory
    // if(false) {
    //   if($scope.input.blockNo==null || $scope.input.blockNo.trim().length<1) {
    //     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter block number of these homes.");
    //     return;
    //   } else {
    //     $scope.input.blockNo=$scope.input.blockNo.replace(/block/gi,'').trim();
    //   }            
    // }

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
          var inputHomeindex=inputHomes.indexOf(existingHomes[i].get("unitNo"));
          if($scope.regionSettings.multiBlock==true && existingHomes[i].get("blockNo")==$scope.input.blockNo && 
              inputHomeindex!=-1) {
                inputHomes.splice(inputHomeindex, 1);
          } else if($scope.regionSettings.multiBlock==false && inputHomeindex!=-1) {
              inputHomes.splice(inputHomeindex, 1);
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
    AccountService.addHomes(AccountService.getUserResidency(), finalHomeList, $scope.input.blockNo, $scope.input.noOfSqFt, $scope.input.noOfBedRooms).then(function(newHomes){
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
    neighborData: null,
    blockNo: "8-W3",
    // regionName: "metropolis_flat_owners_welfare_association_3_17_77_hyderabad"
    regionName: "aug_6th_7_6_311_dublin_"
  };
  //aug_6th_7_6_311_dublin_
  //metropolis_flat_owners_welfare_association_3_17_77_hyderabad
  $scope.splitName=function(fullName) {
    var splitNames={
      firstName: "",
      lastName: ""
    };
    if(fullName!=null & fullName.length>0) {
        var nameArray = fullName.split(' ');
        if(nameArray.length>1) {
          splitNames.lastName=nameArray[nameArray.length-1].toLowerCase().capitalizeFirstLetter();
          for(var i=0;i<nameArray.length-1;i++) {
            splitNames.firstName=splitNames.firstName+nameArray[i]+" ";
          }
          splitNames.firstName=splitNames.firstName.trim().toLowerCase().capitalizeFirstLetter();
        } else {
          splitNames.firstName=nameArray[0].toLowerCase().capitalizeFirstLetter();
        }
    }
    return splitNames;
  } ; 


  $scope.getVehicleInfo=function(neighborLine) {
    var vehicleInfo={
      twoWheeler: null,
      fourWheeler: null
    };
    var neighborLineSplitArray = neighborLine.split('"');
    console.log(JSON.stringify(neighborLineSplitArray));
    if(neighborLineSplitArray.length==1) {
      var neighborLineCommaSplitArray=neighborLine.split(',');
      vehicleInfo.twoWheeler=neighborLineCommaSplitArray[7];
      vehicleInfo.fourWheeler=neighborLineCommaSplitArray[8];
    } else if(neighborLineSplitArray.length==3) {
      vehicleInfo.twoWheeler=neighborLineSplitArray[1];
      var neighborLineCommaSplitArray=neighborLine.split(',');      
      vehicleInfo.fourWheeler=neighborLineCommaSplitArray[neighborLineCommaSplitArray.length-1];      
    } else if(neighborLineSplitArray.length==5) {
      vehicleInfo.twoWheeler=neighborLineSplitArray[1];
      vehicleInfo.fourWheeler=neighborLineSplitArray[3];
    }
    return vehicleInfo;
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
        $scope.createHomeAndUser(neighborLines[i])
      }
      console.log("Submitted all the homes");

    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter neighbor information in comma separated format");
    }
  };

  $scope.createHomeAndUser=function(neighborLines) {
        var neighborLine = neighborLines.split(',');
        console.log(JSON.stringify(neighborLine));

        var vehicleInfo=$scope.getVehicleInfo(neighborLines);
        console.log(JSON.stringify(vehicleInfo));

        var inputHome={
          residency: $scope.input.regionName,
          blockNo: $scope.input.blockNo,
          unitNo: neighborLine[0]
        };

        // Add Home
        console.log("Adding home " + inputHome.unitNo);
        AccountService.addHome(inputHome).then(function(newHome){
          console.log("new home " + JSON.stringify(newHome));

          if(neighborLine[2]!=null && neighborLine[2].trim().length>0) {
            var newUser=new Parse.User();
            newUser.set("username", "91"+neighborLine[2]);
            newUser.set("password", "custom");
            newUser.set("residency", inputHome.residency);
            var splitNames=$scope.splitName(neighborLine[1]);          
            newUser.set("firstName", splitNames.firstName);
            newUser.set("lastName", splitNames.lastName);
            newUser.set("phoneNum", neighborLine[2]);
            newUser.set("countryCode", "91");
            newUser.set("role", "CTZEN");
            newUser.set("notifySetting", true);
            newUser.set("deviceReg", "N");
            newUser.set("homeOwner", true);
            newUser.set("homeNo", newHome.get("homeNo"));
            newUser.set("tourGuide", "PEND");      
            newUser.set("status", "P");

            if(neighborLine[3]!=null && neighborLine[3].trim().length>0) {
              newUser.set("email", neighborLine[3].trim());
            }

            if(neighborLine[4]!=null && neighborLine[4].trim().length==0) {
              newUser.set("vehicleInfo", vehicleInfo);
            }

            // Add User
            console.log("Saving owner " + splitNames.firstName);
            newUser.save().then(function(newUser) {
              // Add user residency
              console.log("Saving user residency "  + splitNames.firstName);
              AccountService.createUserResidency(newUser).then(function(userResidency){
              }, function(error) {
                $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to create user residency. " + JSON.stringify(error));
              }); 
            }, function(error) {
              $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add user in community. " + JSON.stringify(error));
            });    
          }

          // Add tenant
          if(neighborLine[4]!=null && neighborLine[4].trim().length>0) {
            console.log("Adding tenant user " + neighborLine[4]);
            var tenantUser=new Parse.User();
            tenantUser.set("username", "91"+neighborLine[5]);
            tenantUser.set("password", "custom");
            tenantUser.set("residency", inputHome.residency);
            var tenantSplitNames=$scope.splitName(neighborLine[4]);          
            tenantUser.set("firstName", tenantSplitNames.firstName);
            tenantUser.set("lastName", tenantSplitNames.lastName);
            tenantUser.set("phoneNum", neighborLine[5]);
            tenantUser.set("countryCode", "91");
            tenantUser.set("role", "CTZEN");
            tenantUser.set("notifySetting", true);
            tenantUser.set("deviceReg", "N");
            tenantUser.set("homeOwner", false);
            tenantUser.set("homeNo", newHome.get("homeNo"));
            tenantUser.set("tourGuide", "PEND");      
            tenantUser.set("status", "P");

            if(neighborLine[6]!=null && neighborLine[6].trim().length>0) {
              tenantUser.set("email", neighborLine[6].trim());
            }
            tenantUser.set("vehicleInfo", vehicleInfo);

            // Add User
            console.log("Adding tenant user " + neighborLine[4]);
            tenantUser.save().then(function(tenantNewUser) {
              // Add user residency
              console.log("Adding tenant user residency");
              AccountService.createUserResidency(tenantNewUser).then(function(userResidency){
              }, function(error) {
                $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to create tenant user residency. " + JSON.stringify(error));
              }); 
            }, function(error) {
              $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add tenant user in community. " + JSON.stringify(error));
            });                

          } else {
            console.log("Tenant not available");
          }


        },function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add home(s) in your community. " + JSON.stringify(error));
        });
  };


  $scope.cancel=function(){
    $state.go("tab.region",{regionUniqueName: "native"});          
  };

})

.controller('NeighborDetailCtrl', function($scope, $state, $interval, $stateParams,$cordovaDialogs, AccountService, SettingsService, NotificationService, $ionicActionSheet, $timeout, $cordovaClipboard, $ionicHistory, RegionService, $ionicLoading) {
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
        AccountService.getUserResidenciesOfSpecificResidency($scope.user, AccountService.getUserResidency()).then(function(userResidency){
          if(userResidency!=null) {
            console.log("User residency length is moer than zero");
           AccountService.removeUserResidency(userResidency).then(function(deletedUserResidency) {
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
