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
          console.log("edit is success");          
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
        $scope.region.save(null, {
          success: function(region) {
            RegionService.updateRegion(region.get("uniqueName"), region);
            $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});
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
    $scope.regionErrorMessage="Unable to retrieve region information.";
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

    $scope.region.save(null, {
        success: function(region) {
          console.log("edit is success");
          RegionService.updateRegion(region.get("uniqueName"), region);
          $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});          
        }
    });
  };

  $scope.cancel=function(){
    $state.go("tab.legis",{regionUniqueName: AccountService.getUser().get('residency')});
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
        renderChart($scope.finLineItems);        
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
        chartData[i].title=sortedLineItems[i].name;        
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
