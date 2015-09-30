angular.module('starter.controllers')

.controller('RegionListCtrl', function($scope, $http, RegionService) {
  RegionService.all(function(data) {
    $scope.regionList=data;
  });
})


.controller('RegionDetailCtrl', function($scope, $stateParams, RegionService, AccountService) {
  var residency=$stateParams.regionUniqueName;
  if(residency=="native") {
    residency=Parse.User.current().get("residency");
  }
  
  $scope.region=null;
  RegionService.getRegion(residency).then(function(data) {
    // console.log("Retrieved region from service " + JSON.stringify(data));
    $scope.region=data;
  }, function(error) {
    console.log("Error retrieving region " + JSON.stringify(error));
  });

  $scope.canUpdateRegion=AccountService.canUpdateRegion();

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
