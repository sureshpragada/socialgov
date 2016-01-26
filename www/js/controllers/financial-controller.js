angular.module('starter.controllers')

.controller('FinancialCtrl', function($scope, $http) {
  console.log("Financial controller");
})

.controller('HowToMakePaymentCtrl', function($scope, $http, RegionService, SettingsService, AccountService) {
  console.log("How to make payment controller");
  $scope.isAdmin=AccountService.canUpdateRegion();
  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.paymentInstr=region.get("paymentInstr");
    if($scope.paymentInstr==null || $scope.paymentInstr.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Payment instructions are not available.");  
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get payment instructions.");
  });  
})

.controller('UpdateHowToMakePaymentCtrl', function($scope, $state, $http, RegionService, SettingsService) {
  console.log("Update how to make payment controller");
  $scope.input={ paymentInstr: null};
  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.input.paymentInstr=region.get("paymentInstr");
    $scope.region=region;
  }, function(error) {
    console.log("Unable to get region");
  });  

  $scope.updatePaymentInstr=function() {
    if($scope.input.paymentInstr!=null && $scope.input.paymentInstr.length>0) {
      $scope.region.set("paymentInstr", $scope.input.paymentInstr);
      $scope.region.save();
      $state.go("tab.how-to-make-payment");
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter payment instructions.");
    }
  };

})

.controller('ExpenseListCtrl', function($scope, $http, $stateParams, SettingsService, FinancialService) {
  console.log("Expense List controller ");
  $scope.appMessage=SettingsService.getAppMessage();  

  FinancialService.getCurrentMonthExpenseList(Parse.User.current().get("residency")).then(function(expenseList){
    console.log(JSON.stringify(expenseList));    
    if(expenseList==null || expenseList.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Expenses have not found in your community.");
    } else {
      $scope.expenseList = expenseList;
    }
    $scope.$apply();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve your community expenses list.");
  });

})

.controller('ExpenseDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService, AccountService, FinancialService) {
  console.log("Expense detail controller " + $stateParams.expenseId);
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getExpenseRecord($stateParams.expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    console.log(JSON.stringify($scope.expenseRecord));
    $scope.$apply();
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to get the expense record.");
  });

  $scope.deleteExpense = function(){
    FinancialService.deleteExpenseRecord($scope.expenseRecord).then(function(success){
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

.controller('EditExpenseDetailCtrl', function($scope, $http, $stateParams, SettingsService, FinancialService, $state) {
  console.log("Edit expense detail controller"+$stateParams.expenseId);
  FinancialService.getExpenseRecord($stateParams.expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    $scope.editExpense = {
        expenseAmount: $scope.expenseRecord.get("expenseAmount"),
        paidTo: $scope.expenseRecord.get("paidTo"),
        expenseDate: $scope.expenseRecord.get("expenseDate"),
        reason: $scope.expenseRecord.get("reason")
    };
    console.log(JSON.stringify($scope.editExpense));
    $scope.$apply();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get expense record.");
  });  
  
  $scope.cancel=function() {
    $state.go("tab.expense-detail", {expenseId: $stateParams.expenseId});
  };

  $scope.save = function(){
    $scope.expenseRecord.set("expenseAmount",$scope.editExpense.expenseAmount);
    $scope.expenseRecord.set("paidTo",$scope.editExpense.paidTo);
    $scope.expenseRecord.set("expenseDate",$scope.editExpense.expenseDate);
    $scope.expenseRecord.set("reason",$scope.editExpense.reason);
    FinancialService.saveExpense($scope.expenseRecord).then(function(success){
      SettingsService.setAppSuccessMessage("Expense record has been updated.");
      $state.go("tab.expense-list");
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit expense record.");
    });
  };
})


.controller('PaymentDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService) {
  
  console.log("Payment detail controller " + $stateParams.revenueId);

  FinancialService.getRevenueRecord($stateParams.revenueId).then(function(revenueRecord){
    $scope.revenueRecord = revenueRecord[0];
    console.log(JSON.stringify($scope.revenueRecord));
    $scope.$apply();
  },function(error){
    console.log("Unable to get revenue record");
  });

  $scope.deleteRevenue = function(){
    FinancialService.deleteRevenueRecord($scope.revenueRecord).then(function(success){
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
      paymentDate: "Jan 2016",
      amount: "3000.00",
      status: "PAID"
    },
    {
      paymentId: 1234,
      paymentDate:  "Dec 2015",
      amount: "3000.00",
      status: "UNPAID"
    },
    {
      paymentId: 1234,
      paymentDate:  "Nov 2015",
      amount: "3000.00",
      status: "PAID"
    },
    {
      paymentId: 1234,
      paymentDate:  "Oct 2015",
      amount: "2000.00",
      status: "PAID"
    }
  ];

})

.controller('RevenueListCtrl', function($scope, $http, SettingsService, FinancialService) {
  console.log("Revenue List controller");
  $scope.appMessage=SettingsService.getAppMessage();  

  FinancialService.getCurrentMonthRevenueList(Parse.User.current().get("residency")).then(function(revenueList){
    $scope.revenueList = revenueList;
    console.log(JSON.stringify($scope.revenueList));
    $scope.$apply();
  },function(error){
    console.log(error);
  });

})

.controller('ManageRevenueCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService) {
  console.log("Manage Revenue controller ");
  $scope.input={};

  $scope.addRevenue=function() {
    if($scope.input.revenueSource!=null && $scope.input.revenueAmount!=null && $scope.input.revenueDate!=null && $scope.input.note!=null){
      FinancialService.addRevenue($scope.input).then(function(newRevenue){
        console.log(JSON.stringify(newRevenue));
        SettingsService.setAppSuccessMessage("Revenue has been recorded.");
        $state.go("tab.revenue-list");        
      },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add revenue record.");
      });
    }else{
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter all revenue details.");
    }
  };

})

.controller('ManageExpenseCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService) {
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
      FinancialService.addExpense($scope.input).then(function(newExpense){
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

.controller('BalanceSheetCtrl', function($scope, $http, $stateParams, SettingsService, AccountService) {
  console.log("Balance sheet controller ");
})

.controller('ReservesDetailCtrl', function($scope, $http, $stateParams, SettingsService, AccountService, RegionService, FinancialService) {
  console.log("Reserves detail controller ");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();

  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.currentReserve=region.get("reserve");
    console.log("current reserve : " + JSON.stringify($scope.currentReserve));
  }, function(error) {
    console.log("Unable to get reserve amount");
  });  

  FinancialService.getAllReserveAudit(Parse.User.current().get("residency")).then(function(reserveAuditList) {
    console.log("Reserve Audit list : " + JSON.stringify(reserveAuditList));
    $scope.reserveAuditList=reserveAuditList;
    $scope.$apply();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve dues of this community.");
  });

  $scope.deleteReserveAudit=function(index) {
    FinancialService.deleteReserveAudit($scope.reserveAuditList[index]).then(function(reserveAudit) {
      $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Reserve audit entry has been deleted.");
      $scope.reserveAuditList.slice(index, 1);
      $scope.$apply();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete reserve audit entry.");
    });
  };
})

.controller('ManageReservesCtrl', function($scope, $http, $stateParams, $state, SettingsService, RegionService, FinancialService) {
  console.log("Manage Reserves controller");
  $scope.input={
    createdBy: Parse.User.current(),
    residency: Parse.User.current().get("residency")
  };
  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.region=region;
    if($scope.region.get("reserve")!=null) {
      $scope.input.reserveAmount=$scope.region.get("reserve").reserveAmount;
    }
    $scope.input.effectiveMonth=new Date();
    // $scope.$apply();
  }, function(error) {
    console.log("Unable to get reserve amount to prepopulate");
  });  

  $scope.updateReserve=function() {
    RegionService.updateReserve($scope.region, $scope.input).then(function(region) {
      FinancialService.updateReserve($scope.input).then(function(reserveAudit) {
        SettingsService.setAppSuccessMessage("Reserves has been recorded.");
        $state.go("tab.reserves-detail");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add reserve audit.");
      });    
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update community reserves.");
    });
  };

})

.controller('DuesListCtrl', function($scope, $http, SettingsService, FinancialService, AccountService) {
  console.log("Dues List controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();

  console.log("Current region : " + Parse.User.current().get("residency"));
  FinancialService.getAllDues(Parse.User.current().get("residency")).then(function(duesList) {
    if(duesList!=null) {
      console.log("Dues list : " + JSON.stringify(duesList));
      $scope.currentDues=FinancialService.getCurrentDues(duesList);
      $scope.upcomingDues=FinancialService.getUpcomingDues(duesList);
      $scope.duesHistory=FinancialService.getDuesHistory(duesList);
      $scope.$apply();
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Dues have not setup for this community.");
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve dues of this community.");
  });

  $scope.deleteUpcomingDues=function() {
    FinancialService.deleteUpcomingDues($scope.upcomingDues).then(function(dues) {
      $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Upcoming dues have been deleted.");
      $scope.upcomingDues=null;
      $scope.$apply();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to delete upcoming dues.");
    });
  };

})

.controller('ManageDuesCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService) {
  console.log("Manage Dues controller ");

  $scope.input={
    createdBy: Parse.User.current(),
    residency: Parse.User.current().get("residency")
  };
  $scope.duesAction="Setup Dues";

  if($stateParams.duesId!="SETUP") {
    FinancialService.getDuesByObjectId($stateParams.duesId).then(function(dues) {
      console.log(JSON.stringify(dues));
      $scope.input.notes=dues.get("notes");
      $scope.input.effectiveMonth=dues.get("effectiveMonth");
      $scope.input.maintDues=dues.get("maintDues");
      $scope.duesAction="Update Dues";
      $scope.$apply();
    }, function(error) {
      SettingsService.setAppErrorMessage("Unable to get upcoming dues to edit.");
      $state.go("tab.dues-list");
    });
  }

  $scope.updateDues=function() {
    console.log("Input : " + JSON.stringify($scope.input));
    if($stateParams.duesId=="SETUP") {
      FinancialService.setupDues($scope.input).then(function(dues) {
        SettingsService.setAppSuccessMessage("Dues has been recorded.");
        $state.go("tab.dues-list");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to setup dues.");
      });
    } else {
      FinancialService.updateDues($stateParams.duesId, $scope.input).then(function(dues) {
        SettingsService.setAppSuccessMessage("Dues has been updated.");
        $state.go("tab.dues-list");
      }, function(error) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to update dues.");
      });      
    }
  };
})

;
