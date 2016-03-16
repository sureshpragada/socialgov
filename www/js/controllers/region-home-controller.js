angular.module('starter.controllers')

.controller('RegionHomesCtrl', function($scope, $state, $q, $stateParams, AccountService, SettingsService, $ionicLoading) {
  $ionicLoading.show({
    template: "<p class='item-icon-left'>Listing your homes...<ion-spinner/></p>"
  });        
  $scope.appMessage=SettingsService.getAppMessage();    

  $q.all([
    AccountService.getAllHomes(AccountService.getUserResidency()),
    AccountService.getResidentsInCommunity(AccountService.getUserResidency())
  ]).then(function(results){
    var homes=results[0];
    var residents=results[1];
    $scope.homeList=[];    
    for(var i=0;i<homes.length;i++) {
      var residentCount=0;
      for(var j=0;j<residents.length;j++) {
        if(homes[i].get("homeNo")==residents[j].get("homeNo")) {
          residentCount++;
        }
      }
      $scope.homeList.push({
        homeNo: homes[i].get("homeNo"),
        noOfResidents: residentCount
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

.controller('HomeDetailCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading, $ionicHistory) {
  console.log("Home detail controller " + $stateParams.homeNo);
  $ionicLoading.show({
    template: "<p class='item-icon-left'>Listing home residents...<ion-spinner/></p>"
  });        
  $scope.homeNo=$stateParams.homeNo;
  $scope.appMessage=SettingsService.getAppMessage();    
  AccountService.getResidentsOfHome(AccountService.getUserResidency(), $stateParams.homeNo).then(function(neighborList) {
    $scope.neighborList=neighborList;
    if($scope.neighborList.length==0) {
      $scope.residentsNotAvailableMessage=SettingsService.getControllerInfoMessage("Residents have not been invited in to this home. ");
      //Invite residents of this home to collaborate and manage their financials.
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

  $scope.deleteHome=function() {
    AccountService.getHomeByHomeNo($scope.homeNo).then(function(home){
      home.destroy().then(function(deletedHome){
        SettingsService.setAppSuccessMessage("Home " + $scope.homeNo + " has been deleted from your community.");
        $ionicHistory.goBack(-1);
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete home from this community.");
      });
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find home in this community.");
    });    
  };

})

.controller('AddHomesCtrl', function($scope, $stateParams, $q, AccountService, RegionService, $state, SettingsService, LogService) {
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.input={
    homeData: null
  };

  $scope.submit=function(){
    if($scope.input.homeData!=null && $scope.input.homeData.length>0){      
      var inputHomes=[];
      var homeLines = $scope.input.homeData.split('\n');
      for(var i=0; i < homeLines.length; i++){
        var homeLine = homeLines[i].split(',');
        for(var j=0;j<homeLine.length;j++) {
          // replace(/\s+/g, '')  -- Remove only spaces leaving - or anything   
          // $scope.user.homeNumber=$scope.user.homeNumber.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');          
          if(homeLine[j]!=null && homeLine[j].trim().length>0) {
            inputHomes.push(homeLine[j].trim().toUpperCase().replace(/[^0-9A-Z]/g, ''));          
          } else {
            console.log("Skipping.. Invalid home number " + homeLine[j]);
          }          
        }
      }
      // console.log("Input homes " + JSON.stringify(inputHomes));
      // console.log("Removed duplicates  " + JSON.stringify(inputHomes.removeDuplicates()));
      AccountService.addHomes(AccountService.getUserResidency(), inputHomes).then(function(newHomes){
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
    }
    else{
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter home numbers in your community. Please separate them by comma to enter multiple numbers.");
    }
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
    }
    else{
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter neighbor information in comma separated format");
    }
  };

  $scope.cancel=function(){
    $state.go("tab.region",{regionUniqueName: "native"});          
  };

})

;
