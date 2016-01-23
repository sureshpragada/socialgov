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

.controller('ExpenseDetailCtrl', function($scope, $http, $stateParams) {
  console.log("Expense detail controller " + $stateParams.expenseId);
})

.controller('PaymentDetailCtrl', function($scope, $http, $stateParams) {
  console.log("Payment detail controller " + $stateParams.paymentId);
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

  $scope.input={};
  $scope.upcomingMonths=[
      {id:new Date(), label:"Jan 2016"},      
      {id:new Date(), label:"Feb 2016"},      
      {id:new Date(), label:"Mar 2016"}      
    ];

  $scope.addRevenue=function() {
    SettingsService.setAppSuccessMessage("Revenue has been recorded.");
    $state.go("tab.revenue-list");
  };

})

.controller('ManageExpenseCtrl', function($scope, $http, $stateParams, $state, SettingsService) {
  console.log("Manage Expense controller ");

  $scope.input={};
  $scope.upcomingMonths=[
      {id:new Date(), label:"Jan 2016"},      
      {id:new Date(), label:"Feb 2016"},      
      {id:new Date(), label:"Mar 2016"}      
    ];

  $scope.addExpense=function() {
    SettingsService.setAppSuccessMessage("Expense has been recorded.");
    $state.go("tab.expense-list");
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
