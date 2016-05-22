angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})


.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, SettingsService, PictureManagerService, $ionicLoading) {
  SettingsService.trackView("Region detail controller");
  $ionicLoading.show(SettingsService.getLoadingMessage("Loading community"));
  $scope.user=Parse.User.current();  
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.canLogout=AccountService.isLogoutAllowed($scope.user);
  $scope.isAdmin=AccountService.canUpdateRegion();

  var residency=$stateParams.regionUniqueName;
  if(residency==null || residency.trim().length==0 || residency=="native") {
    residency=$scope.user.get("residency");
  }

  $scope.posterImages=[];
  RegionService.getRegion(residency).then(function(data) {
    $scope.region=data;
    $scope.regionSettings=RegionService.getRegionSettings(residency);              
    $scope.canControlSettings=AccountService.isFunctionalAdmin($scope.regionSettings, "Settings");        
    $scope.updateCoverPhotoIfAvailable($scope.region);
    $scope.posterImages=$scope.region.get("posterImages");
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve region information.");
    console.log("Error retrieving region " + JSON.stringify(error));
    $ionicLoading.hide();
  });  

  $scope.updateCoverPhoto=function() {
    SettingsService.trackEvent("Region", "UploadCoverPhoto");    
    RegionService.gotoCoverPhoto();
  };

  $scope.updateCoverPhotoIfAvailable=function(region) {
    if(PictureManagerService.getState().imageUrl!=null) {
      RegionService.updateCoverPhoto(region, PictureManagerService.getState().imageUrl);
      PictureManagerService.reset();
    } 
  };

})

.controller('RegionOfficeDetailCtrl', function($scope, $stateParams, RegionService, AccountService, SettingsService, $state, $ionicPopover, $cordovaDialogs) {
  SettingsService.trackView("Region office detail controller");    
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.regions=RegionService.getRegionListFromCache();
  $scope.canUpdateRegion=AccountService.canUpdateRegion();
  $scope.deleteOffice=function(regionIndex, officeIndex){
    var offices=$scope.regions[regionIndex].get("execOffAddrList");
    offices.splice(officeIndex,1);
    for(var i=0; i < offices.length;i++) { 
      delete offices[i].$$hashKey;
      if(offices[i].contacts!=null) {
        for(var j=0; j < offices[i].contacts.length; j++){
          delete offices[i].contacts[j].$$hashKey;
        }
      }
    }
    $scope.regions[regionIndex].save(null, {
      success: function(region) {
        RegionService.updateRegion(region.get("uniqueName"), region);        
        $scope.$apply(function(){ // To refresh the view with the delete
          $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Office has been deleted.");
          console.log("delete is success");
        });
      },
      error: function(region, error) {
        console.log("Error in deleting the office " + error.message);
        $scope.controllerMessage="Unable to process your delete request.";
      }
    });

  };

  $scope.openOfficePopover=function($event, regionIndex, officeIndex) {
    console.log("On popover : " + regionIndex + " " + officeIndex);
    $scope.canDeleteOffice=$scope.regions[regionIndex].get("execOffAddrList")[officeIndex].type=="DEFAULT"?false:true;
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

  $scope.addContact=function(){
    $scope.popover.hide();
    $state.go("tab.addcontacttooffice",{regionUniqueName: $scope.regions[$scope.regionIndex].get('uniqueName'), officeIndex: $scope.officeIndex});    
  }

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

  $scope.deleteContact=function(regionIndex,officeIndex,contactIndex){
    SettingsService.trackEvent("Region", "DeleteOfficeContact");    
    var offices=$scope.regions[regionIndex].get("execOffAddrList");
    var contacts=offices[officeIndex].contacts;
    contacts.splice(contactIndex,1);
    for(var i=0; i < offices.length;i++) { 
      delete offices[i].$$hashKey;
      if(offices[i].contacts!=null) {
        for(var j=0; j < offices[i].contacts.length; j++){
          delete offices[i].contacts[j].$$hashKey;
        }
      }
    }
    $scope.regions[regionIndex].save(null, {
      success: function(region) {
        RegionService.updateRegion(region.get("uniqueName"), region);        
        $scope.$apply(function(){ // To refresh the view with the delete
          $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Contact has been deleted.");
          console.log("delete is success");
        });
      },
      error: function(region, error) {
        console.log("Error in deleting the office " + error.message);
        $scope.controllerMessage="Unable to process your delete request.";
      }
    });
    console.log(JSON.stringify(contacts));
  };
})

.controller('AddContactToOfficeCtrl', function($scope, $stateParams, $state, RegionService, AccountService, SettingsService) {
  SettingsService.trackView("AddContactToOfficeCtrl");

  $scope.contact={name:"",title:"",phoneNum:"",email:""};
  var office=null,officeContacts=null;
  RegionService.getRegion($stateParams.regionUniqueName).then(function(data) {
    $scope.region=data;
    office=$scope.region.get('execOffAddrList')[$stateParams.officeIndex];
    officeContacts=office.contacts;
    if(officeContacts==undefined){
      officeContacts=[];
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve region information."); 
    console.log("Error retrieving region " + JSON.stringify(error));
  });  

  $scope.submit=function(){

    if($scope.contact.name==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter contact name.");
      return;
    }
    else if($scope.contact.title==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter contact title.");
      return; 
    }
    else if($scope.contact.phoneNum=="" || $scope.contact.phoneNum.length!=10){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter 10 digit phone number.");
      return; 
    }
    // else if($scope.contact.email!=null && $scope.contact.email.trim().length>0) {
    //   if($scope.contact.email.indexOf('@')==-1||$scope.contact.email.indexOf('.')==-1){
    //     $scope.controllerMessage=SettingsService.getControllerErrorMessage("Enter proper Email Id.");
    //     return; 
    //   }
    // }
    else {
      $scope.contact.name=$scope.contact.name.capitalizeFirstLetter();
      $scope.contact.title=$scope.contact.title.capitalizeFirstLetter();
      for(var i=0;i<$scope.region.get('execOffAddrList').length;i++){
        delete $scope.region.get('execOffAddrList')[i].$$hashKey;
        if($scope.region.get('execOffAddrList')[i].contacts!=undefined){
          for(var j=0;j<$scope.region.get('execOffAddrList')[i].contacts.length;j++){
            delete $scope.region.get('execOffAddrList')[i].contacts[j].$$hashKey;
          }
        }
      }
      delete office.$$hashKey;
      officeContacts.push($scope.contact);
      office["contacts"]=officeContacts;
      console.log(JSON.stringify($scope.region));
      $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            SettingsService.setAppSuccessMessage("Contact has been added.");
            $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});
          },
          error: function(region, error) {
            console.log("Error in saving the office details " + error.message);
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add contact."); 
          }
      });
    }
  };
  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});
  };
})


.controller('AddOfficeCtrl', function($scope, $stateParams, $state, RegionService, AccountService, SettingsService) {
  SettingsService.trackView("Add office controller");  
  RegionService.getRegion($stateParams.regionUniqueName).then(function(data) {
    $scope.region=data;
    // execOffAddr=$scope.region.get("execOffAddrList");
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerInfoMessage("Unable to retrieve region information."); 
    console.log("Error retrieving region " + JSON.stringify(error));
  });  

  // $scope.phoneNums={officeNum:"",execNum:""};
  // $scope.newExecAdminObj={title:"",name:"",phoneNumberList:[]};
  $scope.newOfficeObj={name:"", addressLine1:"", addressLine2:"", city:"", state:"", pincode:"",phoneNum:"",type:"CUSTOM"};
  $scope.submit=function(){
    SettingsService.trackEvent("Region", "AddOffice");    
    if($scope.newOfficeObj.name==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter office name."); 
      return;
    }
    else if($scope.newOfficeObj.addressLine1==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter address line1."); 
      return;
    }
    else if($scope.newOfficeObj.city==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter city."); 
      return;
    }
    else if($scope.newOfficeObj.state==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter state."); 
      return;
    }
    else if($scope.newOfficeObj.pincode==""){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter pincode."); 
      return;
    }
    else if($scope.newOfficeObj.phoneNum=="" || $scope.newOfficeObj.phoneNum.length!=10){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Phone number should be 10 characters."); 
      return; 
    }
    else{
        // if($scope.phoneNums.execNum!=""){
        //   var num=$scope.phoneNums.execNum.split(",");
        //   for(var i=0;i < num.length;i++)
        //     $scope.newExecAdminObj.phoneNumberList.push(num[i]);
        // }
        // console.log(JSON.stringify($scope.phoneNums));
        // if($scope.phoneNums.officeNum!=""){
        //   var num=$scope.phoneNums.officeNum.split(",");
        //   for(var i=0;i < num.length;i++)
        //     $scope.newOfficeObj.phoneNumberList.push(num[i]); 
        // }
        // $scope.newOfficeObj.execAdmin.push($scope.newExecAdminObj);
        // execOffAddr.push($scope.newOfficeObj);
        $scope.newOfficeObj.name=$scope.newOfficeObj.name.capitalizeFirstLetter();
        $scope.newOfficeObj.addressLine1=$scope.newOfficeObj.addressLine1.capitalizeFirstLetter();
        $scope.newOfficeObj.addressLine2=$scope.newOfficeObj.addressLine2.capitalizeFirstLetter();
        $scope.newOfficeObj.city=$scope.newOfficeObj.city.capitalizeFirstLetter();
        $scope.newOfficeObj.state=$scope.newOfficeObj.state.capitalizeFirstLetter();
        $scope.region.add("execOffAddrList",$scope.newOfficeObj);
        $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            SettingsService.setAppSuccessMessage("New executive has been added.");
            $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});
          },
          error: function(region, error) {
            console.log("Error in saving the office details " + error.message);
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to submit your add request."); 
          }
        });
    }
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});
  };
})

.controller('EditOfficeDetailsCtrl', function($scope, $stateParams, RegionService, AccountService, SettingsService, $state) {
  SettingsService.trackView("Edit office controller");  
  // $scope.newExecObj={};
  // $scope.newOfficeObj={};
  RegionService.getRegion($stateParams.regionUniqueName).then(function(data) {
    $scope.region=data;
    $scope.newOfficeObj=$scope.region.get('execOffAddrList')[$stateParams.officeIndex];
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve region information."); 
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.submit=function(){
    SettingsService.trackEvent("Region", "EditOffice");    
    // for(var i=0; i < $scope.newOfficeObj.execAdmin.length;i++){ 
    //   delete $scope.newOfficeObj.execAdmin[i].$$hashKey;
    // }
    var officesList=$scope.region.get('execOffAddrList');
    for(var i=0; i <officesList.length;i++){
      delete officesList[i].$$hashKey;
      if(officesList[i].contacts!=undefined){
        for(var j=0;j<officesList[i].contacts.length;j++) {
          delete officesList[i].contacts[j].$$hashKey;
        }
      }
    }

    // if(typeof($scope.newOfficeObj.phoneNumberList)=="string"){
    //   $scope.officeNum=$scope.newOfficeObj.phoneNumberList;
    //   $scope.newOfficeObj.phoneNumberList=[];
    //   var numbers=$scope.officeNum.split(",");
    //   for(var i=0; i < numbers.length;i++){
    //     $scope.newOfficeObj.phoneNumberList.push(numbers[i]);
    //   }
    // }
    // for(var i=0;i<$scope.newOfficeObj.execAdmin.length;i++){
    //     if(typeof($scope.newOfficeObj.execAdmin[i].phoneNumberList)=="string"){
    //       $scope.execNum=$scope.newOfficeObj.execAdmin[i].phoneNumberList;
    //       $scope.newOfficeObj.execAdmin[i].phoneNumberList=[];      
    //       var numbers=$scope.execNum.split(",");
    //       for(var j=0;j < numbers.length;j++){
    //         $scope.newOfficeObj.execAdmin[i].phoneNumberList.push(numbers[j]);
    //       }
    //     }
    // }
    $scope.region.save(null, {
        success: function(region) {
          console.log("edit is success " + JSON.stringify(region));          
          RegionService.updateRegion(region.get("uniqueName"), region);          
          SettingsService.setAppSuccessMessage("Office has been updated.");
          $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});          
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName: $stateParams.regionUniqueName});
  };

})


.controller('RegionFinancialOverviewCtrl', function($scope, $stateParams, $state, AccountService, RegionService, RegionFinancialService, $ionicPopover, $cordovaDialogs, SettingsService) {
  SettingsService.trackView("Region financial overview controller");    
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

.controller('AddRegionFinancialOverviewCtrl', function($scope, $stateParams, AccountService, RegionService, $state, SettingsService) {
  SettingsService.trackView("Add region financial overview controller");    
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

.controller('EditRegionFinancialOverviewCtrl', function($scope, $stateParams, AccountService, RegionService, $state, SettingsService) {
  SettingsService.trackView("Edit region financial overview controller");    
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

.controller('RegionFinancialDetailsCtrl', function($scope, $stateParams, RegionService, RegionFinancialService, SettingsService) {
  SettingsService.trackView("Region financial details controller");  
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

.controller('ChangeDemoDetailsCtrl', function($scope, $state, $stateParams, RegionService, SettingsService, AccountService) {
  SettingsService.trackView("Change demo details controller");  
  $scope.user=AccountService.getUser();
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
    SettingsService.trackEvent("Region", "UpdateDemo");    
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


.controller('RegionSettingsCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, SettingsService, AccountService) {
  SettingsService.trackView("Region settings controller");    
  $scope.user=AccountService.getUser();  
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.isAdmin=AccountService.canUpdateRegion();
  $scope.settingsChanged=false;  

  var regionSettings=RegionService.getRegionSettings($stateParams.regionUniqueName);          
  console.log("Region settings : " + JSON.stringify(regionSettings));
  $scope.inputSettings={
    reserveVisibility: regionSettings.reserveVisibility=="OPEN"?true:false,
    activityModeration: regionSettings.activityModeration
  };

  $scope.whoControlFinancial=RegionService.getFunctionControllersFromRegionSettings(regionSettings, "Financial").convertToFlatString();  
  $scope.whoControlSettings=RegionService.getFunctionControllersFromRegionSettings(regionSettings, "Settings").convertToFlatString();  

  $scope.saveSettings=function() {
    SettingsService.trackEvent("Region", "SaveSettings");    
    RegionService.getRegion($scope.user.get("residency")).then(function(region) {
      var currentRegionSettings=region.get("settings");
      console.log("Current region settings : " + JSON.stringify(currentRegionSettings));

      currentRegionSettings.activityModeration=$scope.inputSettings.activityModeration;
      currentRegionSettings.reserveVisibility=$scope.inputSettings.reserveVisibility==true?"OPEN":"CLOSED";
      region.set("settings", currentRegionSettings);

      region.save().then(function(updatedRegion){
        console.log("Update region settings : " + JSON.stringify(updatedRegion.get("settings")));
        RegionService.updateRegion($scope.user.get("residency"), updatedRegion);
        SettingsService.setAppSuccessMessage("Settings have been saved.");
        $state.go("tab.region", {regionUniqueName: "native"});      
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to save settings.");
        console.log("Error updating region " + JSON.stringify(error));
      });
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find region to save settings.");
      console.log("Error retrieving region " + JSON.stringify(error));
    });    
  };

  $scope.notifySettingChanged=function() {
    $scope.settingsChanged=true;
  };

  $scope.updateCoverPhoto=function() {
    SettingsService.trackEvent("Region", "UploadCoverPhoto");    
    RegionService.gotoCoverPhoto();
  };

  $scope.updateFinancialManagers=function(functionName) {
    $state.go("tab.region-settings-function", {regionUniqueName: $stateParams.regionUniqueName, functionName: "Financial"});
  };

  $scope.updateSettingsManagers=function(functionName) {
    $state.go("tab.region-settings-function", {regionUniqueName: $stateParams.regionUniqueName, functionName: "Settings"});
  };

})

.controller('RegionSettingsFunctionCtrl', function($scope, $stateParams, RegionService, AccountService, $state, $ionicPopover, SettingsService) {
  SettingsService.trackView("Region settings function controller");    
  $scope.settingsChanged=false;  
  $scope.functionName=$stateParams.functionName;
  var regionSettings=RegionService.getRegionSettings($stateParams.regionUniqueName);          
  // console.log("Region settings : " + JSON.stringify(regionSettings));
  var currentFunctionControls=RegionService.getFunctionControllersFromRegionSettings(regionSettings, $stateParams.functionName);
  
  RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
    var legiTitleList=region.get('legiTitles');
    $scope.roleList=[];  
    for(var i=0;i<legiTitleList.length;i++) {
      for(var j=0;j<currentFunctionControls.length;j++) {
        var roleAllowed=false;
        if(currentFunctionControls[j]==legiTitleList[i].title) {
          roleAllowed=true;
          break;
        }
      }
      $scope.roleList.push({
        name: legiTitleList[i].title,
        allowed: roleAllowed
      });              
    }
    console.log("Role list " + JSON.stringify($scope.roleList));
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get legislative titles.");
    LogService.log({type:"ERROR", message: "Unable to get legislative titles " + JSON.stringify(error)}); 
  });    

  $scope.saveSettings=function() {
    SettingsService.trackEvent("Region", "UpdateFuncSettings");    
    console.log("Selection of role list : " + JSON.stringify($scope.roleList));
    var whoIsControlling=[];
    for(var i=0;i<$scope.roleList.length;i++) {
      if($scope.roleList[i].allowed==true) {
        whoIsControlling.push($scope.roleList[i].name);
      }
    }

    console.log("Selected role list : " + JSON.stringify(whoIsControlling));

    if(whoIsControlling.length==0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Select at least one role to control this functionality.");
      return;
    } else {
      RegionService.getRegion($stateParams.regionUniqueName).then(function(region) {
        var currentRegionSettings=region.get("settings");
        console.log("Current region settings : " + JSON.stringify(currentRegionSettings));
        if(currentRegionSettings.permissions!=null) {
          var updated=false;
          for(var i=0;i<currentRegionSettings.permissions.length;i++) {
            if(currentRegionSettings.permissions[i].functionName==$stateParams.functionName) {
              currentRegionSettings.permissions[i].allowedRoles=whoIsControlling;
              updated=true;
              break;
            } 
          }
          if(updated==false) {
            currentRegionSettings.permissions.push({
                functionName: $stateParams.functionName,
                allowedRoles: whoIsControlling
              });                       
          }
        } else {
          currentRegionSettings.permissions=[{
              functionName: $stateParams.functionName,
              allowedRoles: whoIsControlling
            }];           
        }
        region.set("settings", currentRegionSettings);

        region.save().then(function(updatedRegion){
          console.log("Update region settings : " + JSON.stringify(updatedRegion.get("settings")));
          RegionService.updateRegion($stateParams.regionUniqueName, updatedRegion);
          SettingsService.setAppSuccessMessage($stateParams.functionName + " controls have been changed.");
          $state.go("tab.region-settings", {regionUniqueName: $stateParams.regionUniqueName});      
        }, function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to save control settings.");
          console.log("Error updating region " + JSON.stringify(error));
        });
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to find region to save settings.");
        console.log("Error retrieving region " + JSON.stringify(error));
      });    

    }
  };

  $scope.initiateSettingsChange=function() {
    $scope.settingsChanged=true;
  };

})

.controller('CommunityRulesCtrl', function($scope, $http, RegionService, SettingsService, AccountService) {
  SettingsService.trackView("Community rules controller");  
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();
  RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
    $scope.communityRules=region.get("communityRules");
    if($scope.communityRules==null || $scope.communityRules.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Community rules and regulations have not been published for your community.");  
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get community rules and regulations.");
  });  
})

.controller('UpdateCommunityRulesCtrl', function($scope, $state, $http, RegionService, SettingsService, $ionicHistory, AccountService) {
  SettingsService.trackView("Update community rules controller");  
  $scope.input={ communityRules: "1. Do not play loud noises after 10 PM.\n\n2. Do not dry your clothes on the balcony."};
  RegionService.getRegion(AccountService.getUserResidency()).then(function(region) {
    if(region.get("communityRules")!=null && region.get("communityRules").length>0) {
      $scope.input.communityRules=region.get("communityRules");  
    }    
    $scope.region=region;
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get community rules and regulations.");
  });  

  $scope.updateCommunityRules=function() {
    SettingsService.trackEvent("Region", "UpdateCommunityRules");    
    if($scope.input.communityRules!=null && $scope.input.communityRules.length>0) {
      $scope.region.set("communityRules", $scope.input.communityRules);
      $scope.region.save().then(function(newRegion){
        RegionService.updateRegion(newRegion.get("uniqueName"), newRegion);
        SettingsService.setAppSuccessMessage("Community rules and regulations have been updated.");
        $state.go("tab.community-rules");
      }, function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update community rules and regulations.");
        LogService.log({type:"ERROR", message: "Unable to update community rules " + JSON.stringify(error)});           
      });      
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter community rules and regulations.");
    }
  };

})


;
