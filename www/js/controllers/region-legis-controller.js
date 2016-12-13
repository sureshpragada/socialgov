angular.module('starter.controllers')

.controller('RegionLegisDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService) {
  SettingsService.trackView("Region legis details controller");
  $scope.regions=RegionService.getRegionListFromCache();
  $scope.canUpdateRegion=AccountService.canUpdateRegion();
  
  $scope.deleteLegis=function(regionIndex, legisIndex){
    SettingsService.trackEvent("Legis", "Delete");
    $cordovaDialogs.confirm('Do you want to delete this legislative contact?', 'Delete Contact', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.legislatives=$scope.regions[regionIndex].get('legiRepList');
        $scope.legislatives.splice(legisIndex,1);
        for(var i=0; i <$scope.legislatives.length;i++){
          delete $scope.legislatives[i].$$hashKey;
        }

        $scope.regions[regionIndex].save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            $scope.$apply(function(){
              console.log("delete is success");
            });
          },
          error: function(region, error) {
            console.log("Error in deleting the legislative " + error.message);
            $scope.deleteErrorMessage="Unable to process your delete request.";
          }
        });
      } else {
        console.log("Canceled removal of legislative delete");
      }
    });
  };

  $scope.editLegis=function(regionIndex, legislatureIndex) {
    $state.go("tab.editlegis",{regionUniqueName: $scope.regions[regionIndex].get('uniqueName'), legisIndex: legislatureIndex});    
  }

})

.controller('SelfLegisDetailCtrl', function($scope, $ionicLoading, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService) {
  SettingsService.trackView("Region self legis details controller");
  $scope.canUpdateRegion=AccountService.canUpdateRegion();
  $scope.appMessage=SettingsService.getAppMessage();
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading board members"));
  AccountService.getSelfLegisContacts($stateParams.regionUniqueName).then(function(legisList){
    $scope.legisList = legisList;
    if($scope.legisList==null || $scope.legisList.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Legislative board is not established in your community.");
      if($scope.canUpdateRegion==true) {
        $scope.ideaMessage=SettingsService.getControllerIdeaMessage("Looking to establish the board? Use controls above to manage titles and appoint residents on the board.");
      }     
      $ionicLoading.hide(); 
    } else {
      RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
        var legiTitles=region.get('legiTitles');
        var sortedLegiList=[];
        for(var i=0;i<legiTitles.length;i++) {
          for(var j=0;j<$scope.legisList.length;j++) {
            if(legiTitles[i].title==$scope.legisList[j].get("title")) {
              sortedLegiList.push($scope.legisList[j]);
            }
          }
        }
        $scope.legisList=sortedLegiList;
        $ionicLoading.hide();
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to present your board in appropriate order.");
        LogService.log({type:"ERROR", message: "Unable to present your board in appropriate order " + JSON.stringify(error)}); 
        $ionicLoading.hide();
      });    
    }
  },function(error){
    console.log("Unable to get legislative contacts " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve legislative contacts.");
    $ionicLoading.hide();
  });

})

.controller('ManageLegislativeTitlesCtrl', function($scope, $interval, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService, $ionicListDelegate, $ionicLoading) {
  SettingsService.trackView("Region manage legis titles controller");
  $scope.control={
    shuffleInitiated: false
  };

  RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
    $scope.region=region;
    if($scope.region.get('legiTitles')!=null) {
      $scope.legiTitleList=$scope.region.get('legiTitles');
    } else {
      $scope.legiTitleList=[];
    }    
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get legislative titles.");
    LogService.log({type:"ERROR", message: "Unable to get region to get legislative titles  " + JSON.stringify(error)}); 
  });    

  $scope.acceptNewTitle=function() {
    SettingsService.trackEvent("Legis", "NewTitle");
    $cordovaDialogs.prompt('Enter new legislative title', 'Legislative Title', ['Submit','Cancel'])
    .then(function(result) {
      if(result.buttonIndex==1) {
        var input = result.input1;
        if(input!=null && input.trim().length>0) {
          var found=false;
          for(var i=0;i<$scope.legiTitleList.length;i++) {
            if($scope.legiTitleList[i].title==input) {
              found=true;
              break;
            }
          }
          if(found==false) {
            $scope.legiTitleList.push({title: input});
            $scope.saveLegiTitleUpdatesInRegion("Unable to save your legislative title order.");
          } else {
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Title already exists in the list");
          }
        }
      }
    });    
  };

  $scope.deleteTitle=function(index) {
    SettingsService.trackEvent("Legis", "DeleteTitle");
    $scope.legiTitleList.splice(index, 1);
    $scope.saveLegiTitleUpdatesInRegion("Unable to delete title from the list.");    
    $ionicListDelegate.closeOptionButtons();
  };  

  $scope.shuffle=function(item, fromIndex, toIndex) {
    $scope.legiTitleList.splice(fromIndex, 1);
    $scope.legiTitleList.splice(toIndex, 0, item);
    $scope.saveLegiTitleUpdatesInRegion("Unable to order titles in the list.");    
  };

  $scope.saveLegiTitleUpdatesInRegion=function(errorMessage) {
    SettingsService.trackEvent("Legis", "SaveShuffle");
    $ionicLoading.show(SettingsService.getLoadingMessage("Saving your action"));
    $scope.region.set("legiTitles",$scope.legiTitleList);
    $scope.region.save().then(function(region) {
      RegionService.updateRegion(region.get("uniqueName"), region);
      $ionicLoading.hide();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage(errorMessage);
      $interval(function(){
        $scope.controllerMessage=null;
      }, 5000, 1);      
      $ionicLoading.hide();
    });    
  }

})

.controller('BoardAppointmentCtrl', function($scope, $interval, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService, $ionicListDelegate, $ionicLoading, $ionicHistory) {
  SettingsService.trackView("Region board appointment controller");
  $scope.legiTitleSelectedIndex=0;  
  $scope.legiTitleList=[];
  $scope.residentSelectedIndex=0;  
  $scope.residentList=[];

  $scope.tipMessage=SettingsService.getControllerIdeaMessage("Cant find the title on your board? Title management is available in legislatives section.");

  RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
    var legiTitles=region.get('legiTitles');
    for(var i=0;i<legiTitles.length;i++) {
      $scope.legiTitleList.push({
        label: legiTitles[i].title,
        value: legiTitles[i].title
      });
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get legislative titles.");
    LogService.log({type:"ERROR", message: "Unable to get region to get legislative titles  " + JSON.stringify(error)}); 
  });    

  var pageTransData=SettingsService.getPageTransitionData();
  if(pageTransData!=null) {
    $scope.residentList.push({
      label: pageTransData.get("firstName") + " " + pageTransData.get("lastName"),
      value: pageTransData.get("firstName") + " " + pageTransData.get("lastName"),
      opt: pageTransData.get("homeNo"),
      id: pageTransData.id
    });
  } else {
    AccountService.getResidentsInCommunity(AccountService.getUserResidency()).then(function(residents){
      for(var i=0;i<residents.length;i++) {
        var resident=residents[i].get("user");
        console.log("Resident " + resident.get("firstName") + " " + resident.get("lastName"));
        $scope.residentList.push({
          label: resident.get("firstName") + " " + resident.get("lastName"),
          value: resident.get("firstName") + " " + resident.get("lastName"),
          opt: resident.get("homeNo"),
          id: resident.id
        });
      }
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get residents in your community.");
      LogService.log({type:"ERROR", message: "Unable to get residents in community " + JSON.stringify(error)}); 
    });
  }

  $scope.$on('choiceSelectionComplete', function(e,data) {  
    if(data.choiceName=="legiTitles") {
      $scope.legiTitleSelectedIndex=data.selected;  
    } else if(data.choiceName=="residents") {
      $scope.residentSelectedIndex=data.selected;  
    }
  });

  $scope.openChoiceModalOfLegiTitles=function() {
    $scope.$parent.openChoiceModal("legiTitles", $scope.legiTitleList);
  };  

  $scope.openChoiceModalOfResidents=function() {
    $scope.$parent.openChoiceModal("residents", $scope.residentList);
  };

  $scope.appoint=function() {
    SettingsService.trackEvent("Legis", "Appoint");
    $ionicLoading.show(SettingsService.getLoadingMessage("Appointing on the board"));
    AccountService.updateRoleAndTitle($scope.residentList[$scope.residentSelectedIndex].id, "LEGI", 
      $scope.legiTitleList[$scope.legiTitleSelectedIndex].value).then(function(status) {
      SettingsService.setAppSuccessMessage("Resident is appointed on board.");
      $ionicLoading.hide();
      $ionicHistory.goBack(-1);      
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to complete this appointment.");
      $ionicLoading.hide();
    });    
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

})

.controller('AddLegisCtrl', function($scope, $stateParams, $state, RegionService, AccountService, SettingsService) {
  SettingsService.trackView("Region add legis controller");
  $scope.legisErrorMessage=null;
  RegionService.getRegion($stateParams.regionUniqueName).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.legisErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.phoneNums={legisNums:""};
  $scope.newLegisObj={title:"", name:"", addressLine1:"", addressLine2:"", phoneNumberList:[]};
  $scope.submit=function(){
    SettingsService.trackEvent("Legis", "AddLegis");
    if($scope.newLegisObj.title!="" && $scope.newLegisObj.name!=""){
        if($scope.phoneNums.legisNums!=""){
          var num=$scope.phoneNums.legisNums.split(",");
          for(var i=0;i < num.length;i++)
            $scope.newLegisObj.phoneNumberList.push(num[i]);
        }
        $scope.region.add("legiRepList",$scope.newLegisObj);        
        console.log("Legi representative list : " + JSON.stringify($scope.region.get("legiRepList")));
        for(var i=0; i <$scope.region.get('legiRepList').length;i++){
          delete $scope.region.get('legiRepList')[i].$$hashKey;
        }        
        $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});
          },
          error: function(region, error) {
            console.log("Error in saving the legislative details " + error.message);
            $scope.legisErrorMessage="Unable to add legislative contact.";
          }
        });
    }
    else {
      $scope.legisErrorMessage="Legislative name and title are mandatory";
    }
  };

  $scope.cancel=function(){
    $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});
  };
})

.controller('EditLegisDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, $state, SettingsService) {
  SettingsService.trackView("Region edit legis controller");
  var regionUniqueName=$stateParams.regionUniqueName;
  var legisIndex=$stateParams.legisIndex;

  RegionService.getRegion(regionUniqueName).then(function(data) {
    $scope.region=data;
    $scope.legisToBeEdited=$scope.region.get('legiRepList')[legisIndex];
  }, function(error) {
    $scope.legisErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.submit=function(){
    SettingsService.trackEvent("Legis", "EditLegis");
    if(typeof($scope.legisToBeEdited.phoneNumberList)=="string"){
      $scope.legisNum=$scope.legisToBeEdited.phoneNumberList;
      $scope.legisToBeEdited.phoneNumberList=[];
      var numbers=$scope.legisNum.split(",");
      for(var i=0; i < numbers.length;i++){
        $scope.legisToBeEdited.phoneNumberList.push(numbers[i]);
      }
    }
    for(var i=0; i <$scope.region.get('legiRepList').length;i++){
      delete $scope.region.get('legiRepList')[i].$$hashKey;
    }

    console.log("Legi representative list : " + JSON.stringify($scope.region.get("legiRepList")));
    $scope.region.save(null, {
        success: function(region) {
          console.log("edit is success");
          RegionService.updateRegion(region.get("uniqueName"), region);
          $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});          
        },
        error: function(region, error) {
          console.log("Error in updating the legislative details " + error.message);
          $scope.legisErrorMessage="Unable to update legislative contact.";
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});
  };

})


;
