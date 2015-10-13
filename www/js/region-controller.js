angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})


.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService, AccountService, $state) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region=null;
  RegionService.getRegion(residency).then(function(data) {
    // console.log("Retrieved region from service " + JSON.stringify(data));
    $scope.region=data;
    console.log(JSON.stringify($scope.region));
  }, function(error) {
    $scope.regionErrorMessage="Unable to retrieve region information.";
    console.log("Error retrieving region " + JSON.stringify(error));
  });
  console.log(JSON.stringify($scope.region));
  // $scope.offices=$scope.region.get("execOffAddrList");
  // console.log(JSON.stringify($scope.offices));
  // $scope.deleteErrorMessage=null;
  $scope.delete=function(officeName){
    $scope.offices=$scope.region.get("execOffAddrList");
    console.log(JSON.stringify($scope.offices));
    $scope.officeToBeDeleted=null;
    for(var i=0;i<$scope.offices.length;i++)
    {
      if($scope.offices[i].officeName==officeName)
      {
        $scope.officeToBeDeletedIndex=i;
        break;
      }
    }
    $scope.offices.splice(i,1);
    console.log(JSON.stringify($scope.offices));
    for(var i=0; i < $scope.offices.length;i++)
    { 
      delete $scope.offices[i].$$hashKey;
      console.log(JSON.stringify($scope.offices[i]));
      if($scope.offices[i].execAdmin!=null) {
        for(var j=0; j< $scope.offices[i].execAdmin.length;j++)
        {
          delete $scope.offices[i].execAdmin[j].$$hashKey;
        }
      }
    }
    console.log(JSON.stringify($scope.region));
    console.log(JSON.stringify($scope.offices));
    $scope.region.save(null, {
      success: function(region) {
        $scope.$apply(function(){
              console.log("success");
        });
      },
      error: function(region, error) {
        console.log("Error in deleting the office " + error.message);
        $scope.deleteErrorMessage="Unable to process your delete request.";
      }
    });

  };
  
  $scope.canUpdateRegion=AccountService.canUpdateRegion();

})

.controller('AddOfficeCtrl', function($scope, $stateParams, $state) {

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

  $scope.officeErrorMessage=null;
  $scope.phoneNums={officeNum:"",execNum:""};
  $scope.newExecAdminObj={title:"",name:"",phoneNumberList:[]};
  $scope.newOfficeObj={officeName:"", addressLine1:"", addressLine2:"",landmark:"", phoneNumberList:[], execAdmin:[]};
  $scope.submit=function(){
    if($scope.newOfficeObj.officeName!="" && $scope.newOfficeObj.addressLine1!="" && $scope.newExecAdminObj.title!="" && $scope.newExecAdminObj.name!="")
    {
        if($scope.phoneNums.execNum!="")
        {
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
        console.log(JSON.stringify($scope.region));
        $scope.newOfficeObj.execAdmin.push($scope.newExecAdminObj);
        console.log(JSON.stringify($scope.newOfficeObj));
        $scope.region.add("execOffAddrList",$scope.newOfficeObj);
        console.log(JSON.stringify($scope.newOfficeObj));
        $scope.region.save(null, {
          success: function(region) {
            $scope.$apply(function(){
              //$state.go("tab.account");    
              console.log(JSON.stringify($scope.region));
              $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
            });
          },
          error: function(region, error) {
            console.log("Error in saving the office details " + error.message);
            $scope.officeErrorMessage="Unable to submit your add request.";
          }
        });
    }
    else
      $scope.officeErrorMessage="Fill the details properly";
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
        // console.log("Region : " + JSON.stringify($scope.region.get('demography')));        
        $scope.newExecObj=$scope.region.get('execOffAddrList');
        console.log(JSON.stringify($scope.newExecObj));
        for(var i=0; i < $scope.newExecObj.length ; i++)
        {
          if($scope.newExecObj[i].officeName==officeName)
          {
            $scope.newOfficeObj=$scope.newExecObj[i];
            break;
          }
        }
        //$scope.newOfficeObj=$scope.newExecObj.get('');
      });
    },
    error: function(error) {
      console.log("Error retrieving region " + JSON.stringify(error));
    }
  });

  $scope.submit=function(){
    for(var i=0; i < $scope.newOfficeObj.execAdmin.length;i++)
    { 
      delete $scope.newOfficeObj.execAdmin[i].$$hashKey;
      console.log(JSON.stringify($scope.newOfficeObj.execAdmin[i]));
    }
    console.log(JSON.stringify($scope.newOfficeObj));
    // $scope.execNum="";
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
    // console.log($scope.execNum);
    // console.log($scope.officeNum);
    //$scope.region.set("execOffAddrList",$scope.newOfficeObj);
    $scope.region.save(null, {
        success: function(accessRequest) {
          // console.log(JSON.stringify(accessRequest));
          console.log("success");
        }
    });
    $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
  };

  $scope.cancel=function(){
    $state.go("tab.offices",{regionUniqueName:$scope.region.get('uniqueName')});
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
        //console.log("Region financials : " + JSON.stringify(financials));
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
        // console.log("Region : " + JSON.stringify($scope.region.get('demography')));        
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
        success: function(accessRequest) {
          // console.log(JSON.stringify(accessRequest));
        }
    });
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };

  $scope.cancel=function(){
    $state.go("tab.demo",{regionUniqueName:$scope.region.get('uniqueName')});
  };
});
