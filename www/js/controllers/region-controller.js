angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})


.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, SettingsService) {
  $scope.user=Parse.User.current();  
  $scope.appMessage=SettingsService.getAppMessage();  

  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=$scope.user.get("residency");
  }
  $scope.regionSettings=RegionService.getRegionSettings(residency);          
  $scope.isAdmin=AccountService.canUpdateRegion();

  RegionService.getRegion(residency).then(function(data) {
    $scope.region=data;
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve region information.");
    console.log("Error retrieving region " + JSON.stringify(error));
  });
})

.controller('RegionServiceContactsCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {  
  $scope.regions=RegionService.getRegionListFromCache();  

  $scope.personalServiceContacts=null;
  var ServiceContact = Parse.Object.extend("ServiceContact");
  var query = new Parse.Query(ServiceContact);
  query.equalTo("region", AccountService.getUser().get("residency"));
  query.equalTo("status", "A");  
  query.include("user");
  query.descending("createdAt");
  query.find({
    success: function(personalServiceContacts) {
      $scope.$apply(function(){
        if(personalServiceContacts!=null && personalServiceContacts.length>0) {
          $scope.personalServiceContacts=personalServiceContacts;
        } else {
          console.log("No service contacts have been found.");
        }
      });
    },
    error: function(serviceContact, error) {
      console.log("Error retrieving service contacts " + error.message);
    }
  });          

  $scope.gotoAddServiceContact=function() {
    $state.go("tab.add-service-contact",{regionUniqueName: $stateParams.regionUniqueName});
  };

  $scope.deleteServiceContact=function(index) {
    $cordovaDialogs.confirm('Do you want to delete this service contact?', 'Delete Contact', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.personalServiceContacts[index].save({status: "D"}, {
          success: function(updatedServiceContact) {
            $scope.$apply(function(){
              $scope.personalServiceContacts.splice(index,1);        
            });
          },
          error: function(serviceContact, error) {
            console.log("Error removing service contact " + JSON.stringify(error));
            $cordovaDialogs.alert("Unable to delete service contact at this time.");
          }
        });    
      } else {
        console.log("Canceled deletion of service contact");
      }
    });
  };

})

.controller('AddServiceContactsCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {  
  $scope.serviceContact={
    status: "A", 
    type: "Plumber", 
    user: Parse.User.current(),
    region: Parse.User.current().get("residency"),
    serviceName: null,
    servicePhoneNumber: null,
    serviceAddressLine1: null,
    serviceAddressLine2: null
  };

  $scope.submit=function() {
    if($scope.serviceContact.serviceName==null || $scope.serviceContact.serviceName.length==0) {
      $scope.serviceContactErrorMessage="Please enter service provider name.";
      return;
    }

    if($scope.serviceContact.servicePhoneNumber==null || $scope.serviceContact.servicePhoneNumber.length==0) {
      $scope.serviceContactErrorMessage="Please enter service provider phone number.";
      return;
    }

    var ServiceContact = Parse.Object.extend("ServiceContact");
    var serviceContact = new ServiceContact();
    serviceContact.save($scope.serviceContact, {
      success: function(newServiceContact) {
        $state.go("tab.service",{regionUniqueName: AccountService.getUser().get('residency')});
      },
      error: function(serviceContact, error) {
        $scope.serviceContactErrorMessage="Unable to add this service contact.";
        console.log("Error adding service contact " + JSON.stringify(error));
      }
    });     

  };
  
  $scope.cancel=function(){
    $state.go("tab.service",{regionUniqueName: AccountService.getUser().get('residency')});
  };

})

.controller('RegionLegisDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {
  
  $scope.regions=RegionService.getRegionListFromCache();
  $scope.canUpdateRegion=AccountService.canUpdateRegion();
  
  $scope.deleteLegis=function(regionIndex, legisIndex){
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

.controller('RegionOfficeDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, $cordovaDialogs) {
  
  $scope.regions=RegionService.getRegionListFromCache();  
  $scope.canUpdateRegion=AccountService.canUpdateRegion();

  $scope.deleteOffice=function(regionIndex, officeIndex){
    $scope.offices=$scope.regions[regionIndex].get("execOffAddrList");
    $scope.offices.splice(officeIndex,1);
    for(var i=0; i < $scope.offices.length;i++) { 
      delete $scope.offices[i].$$hashKey;
      if($scope.offices[i].execAdmin!=null) {
        for(var j=0; j < $scope.offices[i].execAdmin.length; j++){
          delete $scope.offices[i].execAdmin[j].$$hashKey;
        }
      }
    }

    $scope.regions[regionIndex].save(null, {
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

  $scope.openOfficePopover=function($event, regionIndex, officeIndex) {
    console.log("On popover : " + regionIndex + " " + officeIndex);
    $scope.officeIndex=officeIndex;
    $scope.regionIndex=regionIndex;
    $scope.popover.show($event);
  };

  $ionicPopover.fromTemplateUrl('templates/region/popover-edit-remove.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.editThis=function() {
    $scope.popover.hide();
    $state.go("tab.editoffices",{regionUniqueName: $scope.regions[$scope.regionIndex].get('uniqueName'), officeIndex: $scope.officeIndex});    
  };

  $scope.removeThis=function() {
    $scope.popover.hide();
    $cordovaDialogs.confirm('Do you want to delete this office?', 'Delete Office', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.deleteOffice($scope.regionIndex, $scope.officeIndex);    
      } else {
        console.log("Canceled removal of activity");
      }
    });
  };

})

.controller('AddOfficeCtrl', function($scope, $stateParams, $state, RegionService, AccountService) {

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
            $state.go("tab.offices",{regionUniqueName: AccountService.getUser().get('residency')});
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
    $state.go("tab.offices",{regionUniqueName: AccountService.getUser().get('residency')});
  };
})

.controller('EditOfficeDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, $state) {

  $scope.newExecObj={};
  $scope.newOfficeObj={};
  var regionUniqueName=$stateParams.regionUniqueName;
  var officeIndex=$stateParams.officeIndex;

  RegionService.getRegion(regionUniqueName).then(function(data) {
    $scope.region=data;
    $scope.newOfficeObj=$scope.region.get('execOffAddrList')[officeIndex];
  }, function(error) {
    $scope.regionErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.submit=function(){
    for(var i=0; i < $scope.newOfficeObj.execAdmin.length;i++){ 
      delete $scope.newOfficeObj.execAdmin[i].$$hashKey;
    }
    for(var i=0; i <$scope.region.get('execOffAddrList').length;i++){
      var execOffAddr=$scope.region.get('execOffAddrList')[i];
      delete execOffAddr.$$hashKey;
      for(var j=0;j<execOffAddr.execAdmin.length;j++) {
        delete execOffAddr.execAdmin[j].$$hashKey;
      }
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
          console.log("edit is success " + JSON.stringify(region));          
          RegionService.updateRegion(region.get("uniqueName"), region);          
          $state.go("tab.offices",{regionUniqueName: AccountService.getUser().get('residency')});          
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName: AccountService.getUser().get('residency')});
  };

})

.controller('AddLegisCtrl', function($scope, $stateParams, $state, RegionService, AccountService) {
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

.controller('EditLegisDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, $state) {

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


.controller('RegionFinancialOverviewCtrl', function($scope, $stateParams, $state, AccountService, RegionService, RegionFinancialService, $ionicPopover, $cordovaDialogs) {
  RegionFinancialService.getRegionFinancials(RegionService.getRegionHierarchy()).then(function(financials) {
    if(financials.length==0) {
      $scope.finOverviewErrorMessage="Financial records not available in your region.";
    } else {
      // Divider here based on region
      $scope.financials=[];
      for(var i=0;i<financials.length;i++) {
        $scope.financials.push(financials[i].value);
      }
    }
  }, function(error) {
    console.log("Error retrieving region financials " + JSON.stringify(error));
    $scope.finOverviewErrorMessage="Unable to retrieve financial details.";
  });

  $scope.canUpdateRegion=AccountService.canUpdateRegion();  

  $scope.deleteFinancial=function(index){
    var financialRecord=$scope.financials[index];
    financialRecord.set("status","D");
    financialRecord.save();
    //TODO-delete this record from html view
  };

  $scope.openFinancialPopover=function($event, index, financialRecordId) {
    $scope.financialRecordId=financialRecordId;
    $scope.intendedRecord=index;
    console.log("object Id " + $scope.financialRecordId);
    $scope.popover.show($event);
  };

  $ionicPopover.fromTemplateUrl('templates/region/popover-edit-remove.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.editThis=function() {
    $scope.popover.hide();
    $state.go("tab.editfinancial",{id: $scope.financialRecordId});    
  }

  $scope.removeThis=function() {
    $scope.popover.hide();
    $cordovaDialogs.confirm('Do you want to delete this financial detail?', 'Delete Contact', ['Delete','Cancel']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $scope.deleteFinancial($scope.intendedRecord);
      } else {
        console.log("Canceled removal of financial delete");
      }
    });
  }

})

.controller('AddRegionFinancialOverviewCtrl', function($scope, $stateParams, AccountService, RegionService, $state) {
  
  $scope.addFinancialErrorMessage=null;         

  $scope.newFinancialObj = { year:"", revenue:"", expenses:"", regionUniqueName:$stateParams.regionUniqueName, regionExpenses:[], regionRevenue:[], status:"A" };
  $scope.regionExpRev={regExp:"", regRev:""};

  $scope.submit=function(){

    if($scope.newFinancialObj.year!="" && $scope.newFinancialObj.revenue!="" && $scope.newFinancialObj.expenses!=""){
      
      if($scope.regionExpRev.regExp!=""){
        var regExpLine = $scope.regionExpRev.regExp.split('\n');
        for(var i=0; i < regExpLine.length; i++){
          var regExpense = regExpLine[i].split(',');
          $scope.newFinancialObj.regionExpenses.push( {name:regExpense[0], amount:regExpense[1]} );
        }
      }

      if($scope.regionExpRev.regRev!=""){
        var regRevLine = $scope.regionExpRev.regRev.split('\n');
        for(var i=0; i < regRevLine.length; i++){
          var regRevenue = regRevLine[i].split(',');
          $scope.newFinancialObj.regionRevenue.push( {name:regRevenue[0], amount:regRevenue[1]} );
        }
      }

      var RegionFinancial = Parse.Object.extend("RegionFinancial");
      var regionFinancial = new RegionFinancial();
      regionFinancial.save($scope.newFinancialObj, {
        success: function(financials) {
          console.log(JSON.stringify(financials));
          $state.go("tab.finview",{regionUniqueName:$stateParams.regionUniqueName});          
        }
      });
    }
    else{
      $scope.addFinancialErrorMessage="Please provide year, revenue and expenses details.";
    }
  };

  $scope.cancel=function(){
    $state.go("tab.finview",{regionUniqueName:$stateParams.regionUniqueName});          
  };
})

.controller('EditRegionFinancialOverviewCtrl', function($scope, $stateParams, AccountService, RegionService, $state) {
  
  $scope.financial={};
  var RegionFinancial = Parse.Object.extend("RegionFinancial");
  var query = new Parse.Query(RegionFinancial);
  query.equalTo("objectId", $stateParams.id);
  query.find({
    success: function(financials) {
      $scope.$apply(function(){
        if(financials!=null && financials.length>0) {
          $scope.parseFinancial=financials[0];
          $scope.financial.year=financials[0].get('year');  
          $scope.financial.revenue=financials[0].get('revenue');  
          $scope.financial.expenses=financials[0].get('expenses');
          var regionExpenses=financials[0].get('regionExpenses');
          // console.log(regionExpenses);
          if(regionExpenses!=null){
            var detailedExpenses="";
            for(var i=0; i < regionExpenses.length;i++)
                detailedExpenses += (regionExpenses[i].name+','+regionExpenses[i].amount)+'\n';
            $scope.financial.regionExpenses = detailedExpenses;
            // console.log(detailedExpenses);
          }
          var regionRevenue=financials[0].get('regionRevenue');  
          if(regionRevenue!=null){
            var detailedRevenue="";
            for(var i=0;i<regionRevenue.length;i++)
                detailedRevenue += (regionRevenue[i].name+','+regionRevenue[i].amount)+'\n';
            $scope.financial.regionRevenue = detailedRevenue;
            console.log($scope.detailedRevenue);
          }
          $scope.financial.regionUniqueName=financials[0].get('regionUniqueName');  

          console.log(JSON.stringify($scope.financial));
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
  
  $scope.editFinancialErrorMessage=null;

  $scope.save=function(){
    $scope.parseFinancial.set("year",$scope.financial.year);
    $scope.parseFinancial.set("revenue",$scope.financial.revenue);
    $scope.parseFinancial.set("expenses",$scope.financial.expenses);
    console.log($scope.financial.regionExpenses);
    if($scope.financial.regionExpenses!=null){
        var regionExpenses=[];
        var regExpLines = $scope.financial.regionExpenses.split('\n');
        if(regExpLines[regExpLines.length-1]==""){
          regExpLines.pop();
        }
        console.log(regExpLines);
        for(var i=0; i < regExpLines.length; i++){
          var regExpense = regExpLines[i].split(',');
          regionExpenses.push( {name:regExpense[0], amount:regExpense[1]} );
        }
        $scope.parseFinancial.set("regionExpenses",regionExpenses);
      }

    if($scope.financial.regionRevenue!=null){
      var regionRevenue=[];
      var regRevLines = $scope.financial.regionRevenue.split('\n');
      if(regRevLines[regRevLines.length-1]==""){
        regRevLines.pop();
      }
      console.log(regRevLines);
      for(var i=0; i < regRevLines.length; i++){
        var regRevenue = regRevLines[i].split(',');
        regionRevenue.push( {name:regRevenue[0], amount:regRevenue[1]} );
       }
      $scope.parseFinancial.set("regionRevenue",regionRevenue);
    }
    $scope.parseFinancial.save(null, {
        success: function(financials) {
          console.log(JSON.stringify(financials));
          $state.go("tab.finview",{regionUniqueName:$scope.financial.regionUniqueName});          
        }
      });
  };

  $scope.cancel=function(){
    $state.go("tab.finview",{regionUniqueName:$scope.financial.regionUniqueName});          
  };
})

.controller('RegionFinancialDetailsCtrl', function($scope, $stateParams, RegionService, RegionFinancialService) {
  $scope.pageTitle=$stateParams.reqDetails=="revenue"?"Revenue":"Expenses";
  var financials=RegionFinancialService.getRegionFinancialDetails($stateParams.regionUniqueName, $stateParams.year);
  if(financials!=null) {
    if($stateParams.reqDetails=="revenue") {
      if(financials.get("regionRevenue")!=null && financials.get("regionRevenue").length>0) {
        $scope.finLineItems=financials.get("regionRevenue");  
      } else {
        $scope.finDetailsErrorMessage="Revenue records showing line items not available for "+ $stateParams.year + " finanical year.";      
      }          
    } else {
      if(financials.get("regionExpenses")!=null && financials.get("regionExpenses").length>0) {
        $scope.finLineItems=financials.get("regionExpenses");
      } else {
        $scope.finDetailsErrorMessage="Expense records showing line items not available for "+ $stateParams.year + " finanical year.";      
      }
    }
    renderChart($scope.finLineItems);        
  } else {
    console.log("Error retrieving region financial details.");
    $scope.finDetailsErrorMessage="Unable to load financial details at this time.";    
  }

  $scope.isCategory=function(finItem) {
    if(finItem.amount=='CATEGORY') {
      return "item-divider";
    } else {
      return;
    }
  };   

  function renderChart(lineItems) {
    if(lineItems!=null) {
      // Render the graph
      var ctx = document.getElementById("expChart").getContext("2d");
      var myNewChart = new Chart(ctx).Pie(getChartData($scope.finLineItems), {    
          inGraphDataShow : true, 
          legend: true,
          inGraphDataAnglePosition : 2,
          inGraphDataRadiusPosition: 2,
          inGraphDataRotate : "inRadiusAxisRotateLabels",
          inGraphDataAlign : "center",
          inGraphDataVAlign : "middle",
          inGraphDataFontColor : "white",
          inGraphDataFontSize : 12,
          inGraphDataTmpl: "<%=v6+'%'%>"
     });
    } else {
      $scope.chartErrorMessage="Chart data not available";
    }
  }; 

  function getChartData(lineItems) {
    var chartData=[
      {color:"#F7464A"}, {color:"#46BFBD"}, {color:"#FDB45C"},
      {color:"#949FB1"}, {color:"#4D5360"}, {color:"#4BC459"}
    ];
    // Filter category items and make a copy not to impact showing of original list
    var sortedLineItems=[];
    for(var i=0;i<lineItems.length;i++) {
      if(lineItems[i].amount!="CATEGORY") {
        sortedLineItems.push(lineItems[i]);
      }
    }
    // Sort the array
    sortedLineItems.sort(function(a, b) {
      return parseFloat(b.amount) - parseFloat(a.amount);
    });    
    // Populate chart data based on sorted array 
    for(var i=0;i<chartData.length;i++) {
      if(i<sortedLineItems.length && i<chartData.length-1) {
        chartData[i].value=sortedLineItems[i].amount;
        if(sortedLineItems[i].name.length>20) {
          chartData[i].title=sortedLineItems[i].name.slice(0,20)       
        } else {
          chartData[i].title=sortedLineItems[i].name;
        }        
      } else if(i<sortedLineItems.length && i==chartData.length-1){
        // Preopare misc item
        var miscAmount=0.00;
        for(var j=i;j<sortedLineItems.length;j++) {
          miscAmount=parseFloat(miscAmount)+parseFloat(sortedLineItems[j].amount);
        }
        chartData[i].value=miscAmount;
        chartData[i].title="Misc";        
      } 
    }
    var finalChartData=[];
    for(var i=0;i<chartData.length;i++) {
      if(chartData[i].value!=null) {
        finalChartData.push(chartData[i]);
      }
    }
    // console.log(JSON.stringify(finalChartData));
    return finalChartData;
  };

})

.controller('ChangeDemoDetailsCtrl', function($scope, $state, $stateParams, RegionService, SettingsService) {
  $scope.user=Parse.User.current();
  $scope.regionSettings=RegionService.getRegionSettings($scope.user.get("residency"));      
  $scope.newDemoObj={};
  RegionService.getRegion($scope.user.get("residency")).then(function(region) {
    $scope.region=region;
    $scope.newDemoObj=$scope.region.get('demography');
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get demography details");
    console.log("Unable to get demography details to edit");
  });    

  $scope.submit=function(){
    $scope.region.set("demography",$scope.newDemoObj);
    $scope.region.save().then(function(region) {
          RegionService.updateRegion(region.get("uniqueName"), region);
          SettingsService.setAppSuccessMessage("Demography details updated.");
      }, function(error) {
        console.log("Error saving demograph details");
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to save demography details");
      });
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };

  $scope.cancel=function(){
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };
})

.controller('NeighborDetailCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, NotificationService) {
  console.log("Neighbor details controller " + $stateParams.userId);
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.user=null;
  AccountService.getUserById($stateParams.userId).then(function(neighbor) {
    // console.log("Got the neighbor " + JSON.stringify(neighbor));
    $scope.user=neighbor;
    $scope.isNeighborAdmin=AccountService.canOtherUserUpdateRegion($scope.user);
    $scope.$apply();
  }, function(error) {
    console.log("Unable to retrieve neighbor : " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unbale to retrieve neighbor information.");
  });
  $scope.isAdmin=AccountService.canUpdateRegion();  

  $scope.getRoleNameFromRoleCode=function(role) {
    return AccountService.getRoleNameFromRoleCode(role);
  };

  $scope.sendInvitationCode=function() {
    console.log("Sent invitation code");
    NotificationService.sendInvitationCode($scope.user.id, $scope.user.get("username"));              
    $scope.controllerMessage=SettingsService.getControllerInfoMessage("Sent invitation code to neighbor");
  };

})

.controller('NeighborListCtrl', function($scope, $state, $stateParams, AccountService, SettingsService, $ionicLoading) {
  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner> Listing your neighbors..."
  });        
  $scope.appMessage=SettingsService.getAppMessage();    
  AccountService.getResidentsInCommunity(Parse.User.current().get("residency")).then(function(neighborList) {
    $scope.neighborList=neighborList;
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get neighbors details.");
    $ionicLoading.hide();
  });

})

.controller('AdminNeighborUpdateCtrl', function($scope, $state, $stateParams, SettingsService, LogService, AccountService, $cordovaContacts, NotificationService, RegionService) {
  console.log("Admin Neighbor Account update controller");
  $scope.inputUser={};
  AccountService.getUserById($stateParams.userId).then(function(neighbor) {
    $scope.user=neighbor;
    $scope.inputUser.firstName=$scope.user.get("firstName");
    $scope.inputUser.lastName=$scope.user.get("lastName");
    $scope.inputUser.homeNo=$scope.user.get("homeNo");
    $scope.inputUser.userId=$scope.user.id;
    $scope.inputUser.phoneNum=$scope.user.get("phoneNum");
    $scope.inputUser.homeOwner=$scope.user.get("homeOwner");
    $scope.$apply();
  }, function(error) {
    console.log("Unable to retrieve neighbor : " + JSON.stringify(error));
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unbale to retrieve neighbor information.");
  });  
  $scope.regionSettings=RegionService.getRegionSettings(Parse.User.current().get("residency"));  

  $scope.update=function() {
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

    if($scope.regionSettings.supportHomeNumber==true) {
      if($scope.inputUser.homeNo==null || $scope.inputUser.homeNo.length<=0) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home, unit or apt number.");
        return;
      }       
    }    

    AccountService.updateNeighborAccount($scope.inputUser, $scope.user).then(function(newUser) {
      SettingsService.setAppSuccessMessage("Nighbor information update is successful.");
      $state.go("tab.neighbor-detail", {userId: $scope.user.id});
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update neighbor information.");  
    });
  };
})

;
