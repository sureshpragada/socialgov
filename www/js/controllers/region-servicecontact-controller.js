angular.module('starter.controllers')

.controller('RegionServiceContactsCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService, $ionicLoading, ServiceContactService) {  
  SettingsService.trackView("Region service contacts controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading service contacts"));
  $scope.control={
    searchStr: ""
  };
  
  var regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());    
  $scope.allowServiceContactManagement=true;
  if(regionSettings.serviceContactsVisibility=='CLOSED') {
    if(!AccountService.isFunctionalAdmin(regionSettings, SERVICE_CONTACTS_FUNCTIONAL_NAME)) {
      $scope.allowServiceContactManagement=false;
    }
  }

  // $scope.personalServiceContacts=null;
  ServiceContactService.getServiceContacts($stateParams.regionUniqueName).then(function(serviceContacts){
    console.log("Received : " + JSON.stringify(serviceContacts));
    $scope.personalServiceContacts=serviceContacts;    
    if(serviceContacts==null || serviceContacts.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Service recommendations are not made by your neighbors.");
    }
    $ionicLoading.hide();    
  }, function(error){
    console.log("Error retrieving service contacts " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get your community service recommendations.");
    $ionicLoading.hide();
  });

  $scope.gotoAddServiceContact=function() {
    $state.go("tab.add-service-contact",{regionUniqueName: $stateParams.regionUniqueName});
  };

})

.controller('RegionServiceContactDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs, SettingsService, $ionicLoading, ServiceContactService) {  
  SettingsService.trackView("Region service contact detail controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading service contact"));

  var regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());    
  $scope.allowServiceContactManagement=true;
  if(regionSettings.serviceContactsVisibility=='CLOSED') {
    if(!AccountService.isFunctionalAdmin(regionSettings, SERVICE_CONTACTS_FUNCTIONAL_NAME)) {
      $scope.allowServiceContactManagement=false;
    }
  }
  ServiceContactService.getServiceContactByObjectId(AccountService.getUserResidency(), $stateParams.serviceContactId).then(function(contact){
    console.log("region controller received contact");
    $scope.serviceContact=contact;
    if($scope.serviceContact!=null) {
      $scope.phoneNums=$scope.serviceContact.servicePhoneNumber.split(",");
      for(var i=0;i<$scope.phoneNums.length;i++) {
        if($scope.phoneNums[i].trim().length<=0) {
          $scope.phoneNums.splice(i, 1);
        }
      }
    }
    $ionicLoading.hide();
  },function(error) {
    console.log("Error retrieving service contact " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve service contact.");
    $ionicLoading.hide();
  });  

  $scope.gotoEditServiceContact=function() {
    $state.go("tab.edit-service-contact",{serviceContactId: $scope.serviceContact.objectId});
  };

  $scope.deleteServiceContact=function() {
    SettingsService.trackEvent("ServiceContact", "Delete");
    $cordovaDialogs.confirm('Do you want to delete this service contact?', 'Delete Contact', ['Delete','Ignore']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.serviceContact.status="D";
        $scope.serviceContact.deleteBy=AccountService.getUser();
        ServiceContactService.updateServiceContact($scope.serviceContact).then(function(updatedServiceContact){
          SettingsService.setAppSuccessMessage("Service contact has been deleted successfully.");
          ServiceContactService.refreshServiceContacts(AccountService.getUserResidency());
          $state.go("tab.service",{regionUniqueName: AccountService.getUserResidency()});
        }, function(error){
          console.log("Error removing service contact " + JSON.stringify(error));
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete service contact at this time.");
        });
      } else {
        console.log("Canceled deletion of service contact");
      }
    });
  };

})

.controller('RegionEditServiceContactsCtrl', function($scope, $stateParams, RegionService, AccountService,SettingsService, $state, $ionicPopover, $cordovaDialogs, ServiceContactService) {    
  SettingsService.trackView("Region edit service contacts controller");

  $scope.inputServiceContact={};
  ServiceContactService.getServiceContactByObjectId(AccountService.getUserResidency(), $stateParams.serviceContactId).then(function(contact){
      $scope.inputServiceContact=contact;
    },function(error) {
      console.log("Error retrieving service contacts " + JSON.stringify(error));
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve service contact.");
    });  

  $scope.submit=function(){
    SettingsService.trackEvent("ServiceContact", "Edit");
    if($scope.inputServiceContact.type=="Other" && ($scope.inputServiceContact.otherCategoryName==null || $scope.inputServiceContact.otherCategoryName.length<1)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter category name.");
      return;      
    }

    if($scope.inputServiceContact.serviceName==null || $scope.inputServiceContact.serviceName.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter service provider name.");
      return;
    } else {
      $scope.inputServiceContact.serviceName=$scope.inputServiceContact.serviceName.capitalizeFirstLetter();
    }

    if($scope.inputServiceContact.servicePhoneNumber==null || $scope.inputServiceContact.servicePhoneNumber.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter service provider phone number.");
      return;
    } 

    ServiceContactService.updateServiceContact($scope.inputServiceContact).then(function(serviceContact) {
        SettingsService.setAppSuccessMessage("Service contact has been updated.");
        ServiceContactService.refreshServiceContacts(AccountService.getUserResidency());
        $state.go("tab.service-contact-detail",{serviceContactId: $stateParams.serviceContactId});
      },function(serviceContact, error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add this service contact.");
        console.log("Error adding service contact " + JSON.stringify(error));
      });     
  };

  $scope.cancel=function(){
    $state.go("tab.service",{regionUniqueName: AccountService.getUserResidency()});
  };

})


.controller('AddServiceContactsCtrl', function($scope, $stateParams, RegionService, AccountService,SettingsService, $state, $ionicPopover, $cordovaDialogs, $ionicLoading, ServiceContactService) {  
  SettingsService.trackView("Region add service contact controller");
  $scope.serviceContact={
    status: "A", 
    type: "Plumber", 
    user: AccountService.getUser(),
    region: AccountService.getUserResidency(),
    serviceName: null,
    servicePhoneNumber: null,
    serviceAddressLine1: null,
    serviceAddressLine2: null,
    otherCategoryName: null
  };

  $scope.submit=function() {
    SettingsService.trackEvent("ServiceContact", "Add");
    if($scope.serviceContact.type=="Other" && ($scope.serviceContact.otherCategoryName==null || $scope.serviceContact.otherCategoryName.length<1)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter category name.");
      return;      
    } 

    if($scope.serviceContact.serviceName==null || $scope.serviceContact.serviceName.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter service provider name.");
      return;
    } else {
      $scope.serviceContact.serviceName=$scope.serviceContact.serviceName.capitalizeFirstLetter();
    }

    if($scope.serviceContact.servicePhoneNumber==null || $scope.serviceContact.servicePhoneNumber.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter service provider phone number.");
      return;
    }

    $ionicLoading.show(SettingsService.getLoadingMessage("Adding service contact"));
    ServiceContactService.addServiceContact($scope.serviceContact).then(function(newServiceContact) {
      SettingsService.setAppSuccessMessage("Service contact has been added.")
      ServiceContactService.refreshServiceContacts(AccountService.getUserResidency());
      $ionicLoading.hide();
      $state.go("tab.service",{regionUniqueName: AccountService.getUser().get('residency')});      
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add this service contact.");
      console.log("Error adding service contact " + JSON.stringify(error));
      $ionicLoading.hide();
    });     
  };
  
  $scope.cancel=function(){
    $state.go("tab.service",{regionUniqueName: AccountService.getUserResidency()});
  };

})


;
