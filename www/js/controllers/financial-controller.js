angular.module('starter.controllers')

.controller('FinancialCtrl', function($scope, $http) {
  console.log("Financial controller");
})

.controller('HowToMakePaymentCtrl', function($scope, $http) {
  console.log("How to make payment controller");
})

.controller('ExpenseListCtrl', function($scope, $http, $stateParams, SettingsService) {
  console.log("Expense List controller ");
  $scope.appMessage=SettingsService.getAppMessage();

  SettingsService.getCurrentMonthExpenseList(Parse.User.current().get("residency")).then(function(expenseList){
    $scope.expenseList = expenseList;
    console.log(JSON.stringify($scope.expenseList));
    $scope.$apply();
  },function(error){
    console.log(error);
  });
})

.controller('ExpenseDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Expense detail controller " + $stateParams.expenseId);
  var expenseId = $stateParams.expenseId;
  $scope.expenseErrorMessage=null;
  SettingsService.getExpenseRecord(expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    console.log(JSON.stringify($scope.expenseRecord));
    $scope.$apply();
  },function(error){
    console.log(error);
    $scope.expenseErrorMessage = "Unable to get the expense record.";
  });

  $scope.deleteExpense = function(){
    SettingsService.deleteExpenseRecord($scope.expenseRecord).then(function(success){
      console.log("deleted successfully.");
    },function(error){
      console.log("Unable to delete.");
    });
    $state.go("tab.expense-list");
  };

  $scope.editExpense = function(){
    $state.go("tab.edit-expense-detail",{expenseId: $stateParams.expenseId});
  };
})

.controller('EditExpenseDetailCtrl', function($scope, $http, $stateParams, SettingsService) {
  console.log("Edit expense detail controller"+$stateParams.expenseId);
  SettingsService.getExpenseRecord($stateParams.expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    $scope.editExpense = {expenseAmount:$scope.expenseRecord.get("expenseAmount"),paidTo:$scope.expenseRecord.get("paidTo"),expenseDate:$scope.expenseRecord.get("expenseDate"),reason:$scope.expenseRecord.get("reason")};
    console.log(JSON.stringify($scope.editExpense));
    $scope.$apply();
  },function(error){
    console.log("Unable to get expense record.");
  });
  
  

  $scope.save = function(){
    $scope.expenseRecord.set("expenseAmount",$scope.editExpense.expenseAmount);
    $scope.expenseRecord.set("paidTo",$scope.editExpense.paidTo);
    $scope.expenseRecord.set("expenseDate",$scope.editExpense.expenseDate);
    $scope.expenseRecord.set("reason",$scope.editExpense.reason);
    SettingsService.saveExpense($scope.expenseRecord).then(function(success){
      console.log("Saved successfully");
    },function(error){
      console.log(error);
    });
  };
})


.controller('PaymentDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  
  console.log("Payment detail controller " + $stateParams.revenueId);

  SettingsService.getRevenueRecord($stateParams.revenueId).then(function(revenueRecord){
    $scope.revenueRecord = revenueRecord[0];
    console.log(JSON.stringify($scope.revenueRecord));
    $scope.$apply();
  },function(error){
    console.log("Unable to get revenue record");
  });

  $scope.deleteRevenue = function(){
    SettingsService.deleteRevenueRecord($scope.revenueRecord).then(function(success){
      console.log("Deleted successfully");
      $state.go("tab.revenue-list");
    },function(error){
      console.log("unable to delete the record "+error);
    });
  };
})

.controller('PaymentHistoryCtrl', function($scope, $http) {
  console.log("Payment history controller");

  $scope.paymentList=[
    {
      paymentId: 1234,
      paymentDate: new Date(),
      amount: "3000.00",
      status: "PAID"
    },
    {
      paymentId: 1234,
      paymentDate: new Date(),
      amount: "3000.00",
      status: "UNPAID"
    },
    {
      paymentId: 1234,
      paymentDate: new Date(),
      amount: "3000.00",
      status: "PAID"
    },
    {
      paymentId: 1234,
      paymentDate: new Date(),
      amount: "3000.00",
      status: "PAID"
    }
  ];

})

.controller('RevenueListCtrl', function($scope, $http, SettingsService) {
  console.log("Revenue List controller");
  $scope.appMessage=SettingsService.getAppMessage();  

  SettingsService.getCurrentMonthRevenueList(Parse.User.current().get("residency")).then(function(revenueList){
    $scope.revenueList = revenueList;
    console.log(JSON.stringify($scope.revenueList));
    $scope.$apply();
  },function(error){
    console.log(error);
  });
})

.controller('ReservesDetailCtrl', function($scope, $http, $stateParams, SettingsService) {
  console.log("Reserves detail controller ");
  $scope.appMessage=SettingsService.getAppMessage();
})

.controller('ManageDuesCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Manage Dues controller ");

  $scope.input={};
  $scope.upcomingMonths=[
      {id:new Date(), label:"Jan 2016"},      
      {id:new Date(), label:"Feb 2016"},      
      {id:new Date(), label:"Mar 2016"}      
    ];

  $scope.updateDues=function() {
    SettingsService.setAppSuccessMessage("Dues has been recorded.");
    $state.go("tab.dues-list");
  };

})

.controller('ManageReservesCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Manage Reserves controller ");

  $scope.input={};

  $scope.updateReserve=function() {
    SettingsService.setAppSuccessMessage("Reserves has been recorded.");
    $state.go("tab.reserves-detail");
  };

})

.controller('ManageRevenueCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Manage Revenue controller ");

  $scope.revenueErrorMessage=null;
  $scope.input={};
  $scope.upcomingMonths=[
      {id:new Date(), label:"Jan 2016"},      
      {id:new Date(), label:"Feb 2016"},      
      {id:new Date(), label:"Mar 2016"}      
    ];

  $scope.addRevenue=function() {
    if($scope.input.revenueSource!=null && $scope.input.revenueAmount!=null && $scope.input.revenueDate!=null && $scope.input.note!=null){
      SettingsService.addRevenue($scope.input).then(function(newRevenue){
        console.log(JSON.stringify(newRevenue));
      },function(error){
        console.log(error);
      });
      SettingsService.setAppSuccessMessage("Revenue has been recorded.");
      $state.go("tab.revenue-list");
    }else{
      $scope.revenueErrorMessage = "Please fill the details properly";
    }
  };

})

.controller('ManageExpenseCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Manage Expense controller ");
  console.log(JSON.stringify(Parse.User.current()));
  $scope.expenseErrorMessage=null;
  $scope.input={};
  $scope.upcomingMonths=[
      {id:new Date(), label:"Jan 2016"},      
      {id:new Date(), label:"Feb 2016"},      
      {id:new Date(), label:"Mar 2016"}      
    ];

  $scope.addExpense=function() {
    if($scope.input.paidTo!=null && $scope.input.expenseAmount!=null && $scope.input.expenseDate!=null && $scope.input.reason!=null){
      SettingsService.addExpense($scope.input).then(function(newExpense){
        console.log(JSON.stringify(newExpense));
      },function(error){
        console.log(error);
      });
      SettingsService.setAppSuccessMessage("Expense has been recorded.");
      $state.go("tab.expense-list");
    }else{
      $scope.expenseErrorMessage = "Please fill the details properly";
    }
  };

})

.controller('BalanceSheetCtrl', function($scope, $http, $stateParams, SettingsService) {
  console.log("Balance sheet controller ");
})

.controller('DuesListCtrl', function($scope, $http, SettingsService) {
  console.log("Dues List controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.duesList=[
    {
      amount: "1000.00",
      name: "General Maintenance"
    },
    {
      amount: "2000.00",
      name: "Water"
    }
  ];

})


;
