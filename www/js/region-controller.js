angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})


.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region=null;
  RegionService.getRegion(residency).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.regionErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

})

.controller('RegionLegisDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region=null;
  RegionService.getRegion(residency).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.regionErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.canUpdateRegion=AccountService.canUpdateRegion();
  
  $scope.deleteLegis=function(legisTitle){
    $scope.legislatives=$scope.region.get('legiRepList');
    for(var i=0; i < $scope.legislatives.length; i++){
      if($scope.legislatives[i].title==legisTitle){
        break;
      }
    }
    $scope.legislatives.splice(i,1);
    for(var i=0; i <$scope.legislatives.length;i++){
      delete $scope.legislatives[i].$$hashKey;
    }
    // console.log(JSON.stringify($scope.region));
    $scope.region.save(null, {
      success: function(region) {
        $scope.$apply(function(){
          console.log("delete is success");
        });
      },
      error: function(region, error) {
        console.log("Error in deleting the legislative " + error.message);
        $scope.deleteErrorMessage="Unable to process your delete request.";
      }
    });

  };

  $scope.openLegisPopover=function($event, legisTitle) {
    $scope.intendedTitle=legisTitle;
    $scope.popover.show($event);
  };

  $ionicPopover.fromTemplateUrl('templates/region/popover-edit-remove.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.editThis=function() {
    $scope.popover.hide();
    $state.go("tab.editlegis",{regionUniqueName:$scope.region.get('uniqueName'), uniqueLegisTitle: $scope.intendedTitle});    
  }

  $scope.removeThis=function() {
    $scope.popover.hide();
    $cordovaDialogs.confirm('Do you want to delete this legislative contact?', 'Delete Contact', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.deleteLegis($scope.intendedTitle);
      } else {
        console.log("Canceled removal of legislative delete");
      }
    });
  }
})

.controller('RegionOfficeDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region=null;
  RegionService.getRegion(residency).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.regionErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.canUpdateRegion=AccountService.canUpdateRegion();

  $scope.deleteOffice=function(officeName){
    $scope.offices=$scope.region.get("execOffAddrList");
    $scope.officeToBeDeleted=null;
    for(var i=0;i<$scope.offices.length;i++){
      if($scope.offices[i].officeName==officeName){
        $scope.officeToBeDeletedIndex=i;
        break;
      }
    }
    $scope.offices.splice(i,1);
    for(var i=0; i < $scope.offices.length;i++) { 
      delete $scope.offices[i].$$hashKey;
      if($scope.offices[i].execAdmin!=null) {
        for(var j=0; j < $scope.offices[i].execAdmin.length; j++){
          delete $scope.offices[i].execAdmin[j].$$hashKey;
        }
      }
    }

    $scope.region.save(null, {
      success: function(region) {
        RegionService.updateRegion(region.get("uniqueName"), region);        
        $scope.$apply(function(){ // To refresh the view with the delete
          console.log("delete is success");
        });
      },
      error: function(region, error) {
        console.log("Error in deleting the office " + error.message);
        $scope.deleteErrorMessage="Unable to process your delete request.";
      }
    });

  };

  $scope.openOfficePopover=function($event, officeName) {
    $scope.intendedOffice=officeName;
    $scope.popover.show($event);
  };

  $ionicPopover.fromTemplateUrl('templates/region/popover-edit-remove.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.editThis=function() {
    $scope.popover.hide();
    $state.go("tab.editoffices",{regionUniqueName:$scope.region.get('uniqueName'), uniqueOfficeName: $scope.intendedOffice});    
  };

  $scope.removeThis=function() {
    $scope.popover.hide();
    $cordovaDialogs.confirm('Do you want to delete this office?', 'Delete Office', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.deleteOffice($scope.intendedOffice);    
      } else {
        console.log("Canceled removal of activity");
      }
    });
  };

})

.controller('AddOfficeCtrl', function($scope, $stateParams, $state, RegionService) {

  RegionService.getRegion($stateParams.regionUniqueName).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.officeErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });  

  $scope.officeErrorMessage=null;
  $scope.phoneNums={officeNum:"",execNum:""};
  $scope.newExecAdminObj={title:"",name:"",phoneNumberList:[]};
  $scope.newOfficeObj={officeName:"", addressLine1:"", addressLine2:"",landmark:"", phoneNumberList:[], execAdmin:[]};
  $scope.submit=function(){
    if($scope.newOfficeObj.officeName!="" && $scope.newOfficeObj.addressLine1!="" && $scope.newExecAdminObj.title!="" && $scope.newExecAdminObj.name!=""){
        if($scope.phoneNums.execNum!=""){
          var num=$scope.phoneNums.execNum.split(",");
          for(var i=0;i < num.length;i++)
            $scope.newExecAdminObj.phoneNumberList.push(num[i]);
        }
        console.log(JSON.stringify($scope.phoneNums));
        if($scope.phoneNums.officeNum!=""){
          var num=$scope.phoneNums.officeNum.split(",");
          for(var i=0;i < num.length;i++)
            $scope.newOfficeObj.phoneNumberList.push(num[i]); 
        }
        $scope.newOfficeObj.execAdmin.push($scope.newExecAdminObj);
        $scope.region.add("execOffAddrList",$scope.newOfficeObj);
        $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
          },
          error: function(region, error) {
            console.log("Error in saving the office details " + error.message);
            $scope.officeErrorMessage="Unable to submit your add request.";
          }
        });
    }
    else {
      $scope.officeErrorMessage="Provide office name, office address, admin name and title.";
    }
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
  };
})

.controller('EditOfficeDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, $state) {

  $scope.newExecObj={};
  $scope.newOfficeObj={};
  var residency=$stateParams.regionUniqueName;
  var officeName=$stateParams.uniqueOfficeName;
  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  query.equalTo("uniqueName", residency);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        $scope.region=regions[0];
        $scope.newExecObj=$scope.region.get('execOffAddrList');
        for(var i=0; i < $scope.newExecObj.length ; i++){
          if($scope.newExecObj[i].officeName==officeName){
            $scope.newOfficeObj=$scope.newExecObj[i];
            break;
          }
        }
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.submit=function(){
    for(var i=0; i < $scope.newOfficeObj.execAdmin.length;i++){ 
      delete $scope.newOfficeObj.execAdmin[i].$$hashKey;
    }
    if(typeof($scope.newOfficeObj.phoneNumberList)=="string"){
      $scope.officeNum=$scope.newOfficeObj.phoneNumberList;
      $scope.newOfficeObj.phoneNumberList=[];
      var numbers=$scope.officeNum.split(",");
      for(var i=0; i < numbers.length;i++){
        $scope.newOfficeObj.phoneNumberList.push(numbers[i]);
      }
    }
    for(var i=0;i<$scope.newOfficeObj.execAdmin.length;i++){
        if(typeof($scope.newOfficeObj.execAdmin[i].phoneNumberList)=="string"){
          $scope.execNum=$scope.newOfficeObj.execAdmin[i].phoneNumberList;
          $scope.newOfficeObj.execAdmin[i].phoneNumberList=[];      
          var numbers=$scope.execNum.split(",");
          for(var j=0;j < numbers.length;j++){
            $scope.newOfficeObj.execAdmin[i].phoneNumberList.push(numbers[j]);
          }
        }
    }
    $scope.region.save(null, {
        success: function(region) {
          console.log("edit is success");          
          RegionService.updateRegion(region.get("uniqueName"), region);          
          $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});          
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
  };

})

.controller('AddLegisCtrl', function($scope, $stateParams, $state, RegionService) {

  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  query.equalTo("uniqueName", $stateParams.regionUniqueName);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        $scope.region=regions[0];
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.legisErrorMessage=null;
  $scope.phoneNums={legisNums:""};
  $scope.newLegisObj={title:"", name:"", addressLine1:"", addressLine2:"", phoneNumberList:[]};
  $scope.submit=function(){
    if($scope.newLegisObj.title!="" && $scope.newLegisObj.name!=""){
        if($scope.phoneNums.legisNums!=""){
          var num=$scope.phoneNums.legisNums.split(",");
          for(var i=0;i < num.length;i++)
            $scope.newLegisObj.phoneNumberList.push(num[i]);
        }
        $scope.region.add("legiRepList",$scope.newLegisObj);
        $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            $state.go("tab.legis",{regionUniqueName:$scope.region.get('uniqueName')});
          },
          error: function(region, error) {
            console.log("Error in saving the legislative details " + error.message);
            $scope.legisErrorMessage="Unable to submit your add request.";
          }
        });
    }
    else
      $scope.legisErrorMessage="Provide title, name and address line";
  };

  $scope.cancel=function(){
    $state.go("tab.legis",{regionUniqueName:$scope.region.get('uniqueName')});
  };
})

.controller('EditLegisDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, $state) {

  var residency=$stateParams.regionUniqueName;
  var legisTitle=$stateParams.uniqueLegisTitle;
  console.log(legisTitle);
  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  query.equalTo("uniqueName", residency);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        $scope.region=regions[0];
        //console.log(JSON.stringify($scope.region));
        $scope.newLegisObj=$scope.region.get('legiRepList');
        for(var i=0; i < $scope.newLegisObj.length ; i++){
          if($scope.newLegisObj[i].title==legisTitle){
            $scope.legisToBeEdited=$scope.newLegisObj[i];
            break;
          }
        }
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.submit=function(){
    if(typeof($scope.legisToBeEdited.phoneNumberList)=="string"){
      $scope.legisNum=$scope.legisToBeEdited.phoneNumberList;
      $scope.legisToBeEdited.phoneNumberList=[];
      var numbers=$scope.legisNum.split(",");
      for(var i=0; i < numbers.length;i++){
        $scope.legisToBeEdited.phoneNumberList.push(numbers[i]);
      }
    }
    $scope.region.save(null, {
        success: function(region) {
          console.log("edit is success");
          RegionService.updateRegion(region.get("uniqueName"), region);
          $state.go("tab.legis",{regionUniqueName:$scope.region.get('uniqueName')});          
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.legis",{regionUniqueName:$scope.region.get('uniqueName')});
  };

})


.controller('RegionFinancialOverviewCtrl', function($scope, $stateParams, RegionService) {
  var RegionFinancial = Parse.Object.extend("RegionFinancial");
  var query = new Parse.Query(RegionFinancial);
  query.equalTo("regionUniqueName", $stateParams.regionUniqueName);
  query.descending("year");
  query.find({
    success: function(financials) {
      $scope.$apply(function(){
        if(financials!=null && financials.length>0) {
          $scope.financials=financials;  
        } else {
          $scope.finOverviewErrorMessage="No financial records available for your region.";    
        }
      });
    },
    error: function(error) {
      console.log("Error retrieving region financials " + JSON.stringify(error));
      $scope.finOverviewErrorMessage="Unable to load financial overview at this time.";
    }
  });          

})

.controller('RegionFinancialDetailsCtrl', function($scope, $stateParams, RegionService) {
  $scope.pageTitle=$stateParams.reqDetails=="revenue"?"Revenue":"Expenses";
  var RegionFinancial = Parse.Object.extend("RegionFinancial");
  var query = new Parse.Query(RegionFinancial);
  query.equalTo("regionUniqueName", $stateParams.regionUniqueName);
  query.equalTo("year", $stateParams.year);
  query.find({
    success: function(financials) {
      $scope.$apply(function(){
        //console.log("Region financials : " + JSON.stringify(financials));
        if($stateParams.reqDetails=="revenue") {
          if(financials[0].get("regionRevenue")!=null) {
            $scope.finLineItems=financials[0].get("regionRevenue");  
          } else {
            $scope.finDetailsErrorMessage="Revenue records showing line items not available for "+ $stateParams.year + " finanical year.";      
          }          
        } else {
          if(financials[0].get("regionExpenses")!=null) {
            $scope.finLineItems=financials[0].get("regionExpenses");
          } else {
            $scope.finDetailsErrorMessage="Expense records showing line items not available for "+ $stateParams.year + " finanical year.";      
          }
        }
      });
    },
    error: function(error) {
      console.log("Error retrieving region financial details " + JSON.stringify(error));
      $scope.finDetailsErrorMessage="Unable to load financial details at this time.";
    }
  });      

  $scope.isCategory=function(finItem) {
    if(finItem.amount=='CATEGORY') {
      return "item-divider";
    } else {
      return;
    }
  };     

})

.controller('ChangeDemoDetailsCtrl', function($scope, $state, $stateParams) {
  $scope.newDemoObj={}; 
  var residency=$stateParams.regionUniqueName;
  var Region = Parse.Object.extend("Region");
  var query = new Parse.Query(Region);
  query.equalTo("uniqueName", residency);
  query.find({
    success: function(regions) {
      $scope.$apply(function(){
        $scope.region=regions[0];
        $scope.newDemoObj=$scope.region.get('demography');
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.submit=function(){
    $scope.region.set("demography",$scope.newDemoObj);
    $scope.region.save(null, {
        success: function(region) {
          RegionService.updateRegion(region.get("uniqueName"), region);
        }
    });
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };

  $scope.cancel=function(){
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };
});
