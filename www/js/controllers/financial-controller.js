angular.module('starter.controllers')

.controller('FinancialCtrl', function($scope, $http, $ionicLoading, FinancialService, SettingsService, RegionService) {
  console.log("Financial controller");

  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.user=Parse.User.current();
  $scope.regionSettings=RegionService.getRegionSettings($scope.user.get("residency"));    

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading financial snapshot...<ion-spinner/></p>"
  });

  // Payment status : Retrieve from user object
  $scope.paymentStatus="NA";
  if($scope.regionSettings.financialMgmt=="SELF") {
    FinancialService.getMyPaymentHistory($scope.user.get("residency"), $scope.user.get("homeNo")).then(function(paymentList) {
      if(paymentList!=null && paymentList.length>0) {
        var lastPaymentDate=paymentList[0].get("revenueDate");
        var currentDate=new Date();
        if(currentDate.getFullYear()>lastPaymentDate.getFullYear() || (currentDate.getFullYear()==lastPaymentDate.getFullYear() && currentDate.getMonth()>lastPaymentDate.getMonth())) {
          $scope.paymentStatus="Unpaid";  
        } else {
          $scope.paymentStatus="Paid";  
        }
        $scope.$apply();
      } else {
        $scope.paymentStatus="Unpaid";
      }
    }, function(error) {
      console.log("Unable to get payment history to calculate paid status " + JSON.stringify(error));
    });
  }

  // Dues calculation
  $scope.currentDues=null;  
  FinancialService.getAllDues(Parse.User.current().get("residency")).then(function(duesList) {    
    if(duesList!=null) {
      $scope.currentDues=FinancialService.getCurrentDues(duesList);
      if($scope.currentDues==null) {
        $scope.currentDues=FinancialService.getUpcomingDues(duesList);
      }
      $scope.$apply();
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve dues of this community.");
  });  

  // Reserve Calculation
  $scope.reserve="NA";
  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    var currentReserve=region.get("reserve");
    if(currentReserve!=null) {
      $scope.reserve=currentReserve.reserveAmount;
    }
  }, function(error) {
    console.log("Unable to get reserves details of this community.");
  });  

  $ionicLoading.hide();

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

.controller('ExpenseListCtrl', function($scope, $http, $stateParams, SettingsService, FinancialService, AccountService) {
  console.log("Expense List controller ");
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.focusMonth=new Date(parseInt($stateParams.focusMonth));  
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getMonthlyExpenses(Parse.User.current().get("residency"), $scope.focusMonth).then(function(expenseList){
    if(expenseList==null || expenseList.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Expenses have not found in your community.");
    } else {
      $scope.expenseList = expenseList;
    }
    // console.log("Expense list : " + JSON.stringify($scope.expenseList));
    $scope.$apply();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve your community expenses list.");
  });

})

.controller('ExpenseDetailCtrl', function($scope, $http, $stateParams, $ionicModal, $state, SettingsService, AccountService, FinancialService, PictureManagerService) {
  console.log("Expense detail controller " + $stateParams.expenseId);
  $scope.isAdmin=AccountService.canUpdateRegion();
  console.log($scope.isAdmin);
  FinancialService.getExpenseRecord($stateParams.expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    console.log(JSON.stringify($scope.expenseRecord));

    var stateData=PictureManagerService.getState();
    if(stateData.imageUrl!=null) {
      var images=$scope.expenseRecord.get("images");
      if(images!=null && images.length>0) {
        images.push(stateData.imageUrl);
      } else {
        images=[stateData.imageUrl];
      }
      $scope.expenseRecord.set("images", images);
      $scope.expenseRecord.save();
      PictureManagerService.reset();
      console.log("Expense receipt uploaded");
    } else {
      console.log("Not expense receipt upload flow");
    }

    $scope.$apply();
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to get the expense record.");
  });

  $scope.deleteExpense = function(){
    FinancialService.deleteExpenseRecord($scope.expenseRecord).then(function(deletedExpenseRecord){
      SettingsService.setAppSuccessMessage("Successfully delted the expense record.");
      $state.go("tab.expense-list", {focusMonth: deletedExpenseRecord.get("expenseDate").getTime()});
    },function(error){
      $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to delete.");
    });
  };

  $scope.editExpense = function(){
    $state.go("tab.edit-expense-detail",{expenseId: $stateParams.expenseId});
  };

  $scope.attachPicture = function() {
    PictureManagerService.reset();
    PictureManagerService.setFromPage("tab.expense-detail");
    PictureManagerService.setFromPagePathParamValue({expenseId: $stateParams.expenseId});
    $state.go("tab.financial-picman");    
  };

  $scope.deleteExpenseReceipt=function() {
    var images=$scope.expenseRecord.get("images");
    images.splice($scope.viewingExpenseReceiptIndex, 1);
    $scope.expenseRecord.set("images", images);
    $scope.expenseRecord.save()
    $scope.modal.hide();
  }

  $ionicModal.fromTemplateUrl('templates/picture-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  })  

  $scope.showExpenseReceipt = function(index) {
    $scope.removeExpenseReceipt=true;
    $scope.viewingExpenseReceiptIndex=index;
    if($scope.expenseRecord.get("images")!=null && $scope.expenseRecord.get("images").length>0) {
      $scope.imageUrl=$scope.expenseRecord.get("images")[index];
      $scope.modal.show();
    } else {
      console.log("Receipts not available for this expense");
    }
  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });  
})

.controller('ManageExpenseCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService) {
  console.log("Manage Expense controller ");
  $scope.availableCategories=FinancialService.getExpenseCategories();
  $scope.focusMonth=new Date(parseInt($stateParams.focusMonth));  
  $scope.input={
    expenseDate: $scope.focusMonth.getMonth()==new Date().getMonth()?new Date():$scope.focusMonth,
    category: $scope.availableCategories[0]
  };

  $scope.addExpense=function() {
    if($scope.input.expenseAmount==null ||  $scope.input.expenseAmount.length<1) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter expense amount");
      return;
    }
    if($scope.input.category.value=='Other' && $scope.input.paidTo==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter paid to for other expense");
      return;      
    }

    FinancialService.addExpense($scope.input).then(function(newExpense){
      SettingsService.setAppSuccessMessage("Expense has been recorded.");
      $state.go("tab.expense-list", {focusMonth: $scope.focusMonth.getTime()});        
    },function(error){
      $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to record the expense.");
    });
  };

})

.controller('EditExpenseDetailCtrl', function($scope, $http, $stateParams, SettingsService, FinancialService, $state) {
  console.log("Edit expense detail controller"+$stateParams.expenseId);
  $scope.availableCategories=FinancialService.getExpenseCategories();
  FinancialService.getExpenseRecord($stateParams.expenseId).then(function(expenseRecord){
    $scope.expenseRecord = expenseRecord[0];
    $scope.editExpense = {
        expenseAmount: $scope.expenseRecord.get("expenseAmount"),
        paidTo: $scope.expenseRecord.get("paidTo"),
        expenseDate: $scope.expenseRecord.get("expenseDate"),
        reason: $scope.expenseRecord.get("reason"),
        category: FinancialService.getSelectedExpenseCategory($scope.availableCategories, $scope.expenseRecord.get("category"))
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
    if($scope.editExpense.expenseAmount==null ||  $scope.editExpense.expenseAmount.length<1) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter expense amount");
      return;
    }
    if($scope.editExpense.category.value=='Other' && $scope.editExpense.paidTo==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter paid to for other expense");
      return;      
    }

    $scope.expenseRecord.set("expenseCategory",$scope.editExpense.category.value);
    $scope.expenseRecord.set("expenseAmount",$scope.editExpense.expenseAmount);
    $scope.expenseRecord.set("paidTo",$scope.editExpense.paidTo!=null?$scope.editExpense.paidTo.capitalizeFirstLetter():$scope.editExpense.paidTo);
    $scope.expenseRecord.set("expenseDate",$scope.editExpense.expenseDate);
    $scope.expenseRecord.set("reason",$scope.editExpense.reason);
    FinancialService.saveExpense($scope.expenseRecord).then(function(savedExpenseRecord){
      SettingsService.setAppSuccessMessage("Expense record has been updated.");
      $state.go("tab.expense-list", {focusMonth: savedExpenseRecord.get("expenseDate").getTime()});
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit expense record.");
    });
  };
})

.controller('PaymentDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, AccountService) {  
  console.log("Payment detail controller " + $stateParams.revenueId);
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getRevenueRecord($stateParams.revenueId).then(function(revenueRecord){
    $scope.revenueRecord = revenueRecord[0];
    console.log(JSON.stringify($scope.revenueRecord));
    $scope.$apply();
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to get revenue record");
  });

  $scope.editRevenue = function(){
    $state.go("tab.edit-payment-detail", {revenueId:$stateParams.revenueId});
  };

  $scope.deleteRevenue = function(){
    FinancialService.deleteRevenueRecord($scope.revenueRecord).then(function(success){
      SettingsService.setAppSuccessMessage("Successfully deleted the revenue record.");
      $state.go("tab.revenue-list", {focusMonth: $scope.revenueRecord.get("revenueDate").getTime()});
    },function(error){
      $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to delete the record");
    });
  };
})

.controller('EditPaymentDetailCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, AccountService) {  
  console.log("Edit payment detail controller " + $stateParams.revenueId);

  FinancialService.getRevenueRecord($stateParams.revenueId).then(function(revenueRecord){
    $scope.revenueRecord = revenueRecord[0];
    $scope.editRevenueRecord = {
      revenueAmount: $scope.revenueRecord.get("revenueAmount"),
      revenueDate: $scope.revenueRecord.get("revenueDate"),
      revenueSource: $scope.revenueRecord.get("revenueCategory")=="MAINT_DUES"?"":$scope.revenueRecord.get("revenueSource"),
      note: $scope.revenueRecord.get("note"),
      homeNo: $scope.revenueRecord.get("homeNo"),
      category: $scope.revenueRecord.get("revenueCategory")=="MAINT_DUES"?true:false
    };
    console.log(JSON.stringify($scope.editRevenueRecord));

    AccountService.getListOfHomesInCommunity(Parse.User.current().get("residency")).then(function(homesList) {
      if(homesList!=null && homesList.length>0) {
        $scope.availableHomes=homesList; 
        $scope.editRevenueRecord.home=AccountService.getHomeRecordFromAvailableHomes($scope.availableHomes, $scope.revenueRecord.get("homeNo"));  
      }
    }, function(error) {
      console.log("Unable to get available home number");
    });
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to get revenue record");
  });

  $scope.save = function(){
    if($scope.editRevenueRecord.revenueAmount==null ||  $scope.editRevenueRecord.revenueAmount.length<1) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter revenue amount");
      return;
    }

    if($scope.editRevenueRecord.category==true) {
      if($scope.availableHomes!=null && $scope.availableHomes.length>0) {
        $scope.editRevenueRecord.revenueSource="Home # " + $scope.editRevenueRecord.home.value;
        $scope.editRevenueRecord.homeNo=$scope.editRevenueRecord.home.value;
      } else {
        if($scope.editRevenueRecord.homeNo==null ||  $scope.editRevenueRecord.homeNo.length<1) {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home number");
          return;
        }        
      }
    } else {
      if($scope.editRevenueRecord.revenueSource==null ||  $scope.editRevenueRecord.revenueSource.length<1) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter revenue source");
        return;
      } else {
        $scope.editRevenueRecord.homeNo="";
      }
    }

    $scope.revenueRecord.set("revenueCategory",$scope.editRevenueRecord.category==true?"MAINT_DUES":"OTHER");
    $scope.revenueRecord.set("revenueAmount",$scope.editRevenueRecord.revenueAmount);
    $scope.revenueRecord.set("revenueDate",$scope.editRevenueRecord.revenueDate);
    $scope.revenueRecord.set("revenueSource",$scope.editRevenueRecord.revenueSource);
    $scope.revenueRecord.set("note",$scope.editRevenueRecord.note);
    FinancialService.saveRevenue($scope.revenueRecord).then(function(success){
      SettingsService.setAppSuccessMessage("Revenue record has been updated.");
      $state.go("tab.payment-detail",{revenueId:$stateParams.revenueId});
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit revenue record.");
    });
  };

  $scope.cancel=function() {
    $state.go("tab.payment-detail", {revenueId: $stateParams.revenueId});
  };
})

.controller('PaymentHistoryCtrl', function($scope, $http, SettingsService, FinancialService) {
  console.log("Payment history controller");

  var user=Parse.User.current();
  FinancialService.getMyPaymentHistory(user.get("residency"), user.get("homeNo")).then(function(paymentList) {
    if(paymentList!=null && paymentList.length>0) {
      $scope.paymentList=paymentList;
      $scope.$apply();
    } else {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("You have not made any payments.");  
    }
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get your payment history.");
  });

})

.controller('RevenueListCtrl', function($scope, $http, $state, SettingsService, FinancialService, $stateParams, AccountService) {
  console.log("Revenue List controller");
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.focusMonth=new Date(parseInt($stateParams.focusMonth));  
  $scope.isAdmin=AccountService.canUpdateRegion();

  $scope.homeOwnerPaymentRevenueList=[];
  $scope.otherRevenueList=[];

  FinancialService.getMonthlyRevenues(Parse.User.current().get("residency"), $scope.focusMonth).then(function(revenueList){
    if(revenueList==null || revenueList.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Revenues have not found in your community.");
    } else {
      for(var i=0;i<revenueList.length;i++) {
        if(revenueList[i].get("revenueCategory")=="MAINT_DUES") {
          $scope.homeOwnerPaymentRevenueList.push(revenueList[i]);
        } else {
          $scope.otherRevenueList.push(revenueList[i]);
        }
      }
    }

    AccountService.getListOfHomesInCommunity(Parse.User.current().get("residency")).then(function(homesList) {
      $scope.unpaidHomeOwnerList=[];
      if(homesList.length>0) {
        for(var i=0;i<homesList.length;i++) {
          var found=false;
          for(var j=0;j<$scope.homeOwnerPaymentRevenueList.length;j++) {
            if(homesList[i].value==$scope.homeOwnerPaymentRevenueList[j].get("homeNo")) {
              found=true;
              break;
            }
          }
          if(!found) {
            $scope.unpaidHomeOwnerList.push(homesList[i]);
          }
        }
      }
    }, function(error) {
      console.log("Unable to get available home numbers");
    });  

    $scope.$apply();
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to retrieve revenue records.");
  });

  $scope.goToManageRevenuePage=function(targetHomeNo) {
    SettingsService.setPageTransitionData({homeNo: targetHomeNo});
    $state.go("tab.manage-revenue", {focusMonth: $scope.focusMonth.getTime()});
  }
})

.controller('ManageRevenueCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, $ionicHistory, AccountService) {
  console.log("Manage Revenue controller ");
  $scope.focusMonth=new Date(parseInt($stateParams.focusMonth));  
  $scope.input={
    revenueDate: $scope.focusMonth.getMonth()==new Date().getMonth()?new Date():$scope.focusMonth,
    category: true
  };

  AccountService.getListOfHomesInCommunity(Parse.User.current().get("residency")).then(function(homesList) {
    if(homesList!=null && homesList.length>0) {
      $scope.availableHomes=homesList;      
      var pageTransitionData=SettingsService.getPageTransitionData();
      if(pageTransitionData!=null && pageTransitionData.homeNo!=null) {
        $scope.input.home=AccountService.getHomeRecordFromAvailableHomes($scope.availableHomes, pageTransitionData.homeNo);
      } else {
        $scope.input.home=$scope.availableHomes[0];    
      }
    }
  }, function(error) {
    console.log("Unable to get available home number");
  });

  FinancialService.getAllDues(Parse.User.current().get("residency")).then(function(duesList) {    
    if(duesList!=null) {
      var currentDues=FinancialService.getCurrentDues(duesList);
      if(currentDues!=null) {
        $scope.input.revenueAmount=currentDues.get("maintDues");
      } else {
        var upcomingDues=FinancialService.getUpcomingDues(duesList);
        if(upcomingDues!=null) {
          $scope.input.revenueAmount=upcomingDues.get("maintDues");
        }
      }
    }
  }, function(error) {
    console.log("Unable to retrieve dues of this community");
  });      

  $scope.addRevenue=function() {

    if($scope.input.revenueAmount==null ||  $scope.input.revenueAmount.length<1) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter revenue amount");
      return;
    }

    if($scope.input.category==true) {
      if($scope.availableHomes!=null && $scope.availableHomes.length>0) {
        $scope.input.revenueSource="Home # " + $scope.input.home.value;
        $scope.input.homeNo=$scope.input.home.value;
      } else {
        if($scope.input.homeNo==null ||  $scope.input.homeNo.length<1) {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter home number");
          return;
        }        
      }
    } else {
      if($scope.input.revenueSource==null ||  $scope.input.revenueSource.length<1) {
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter revenue source");
        return;
      }
    }
  
    FinancialService.addRevenue($scope.input).then(function(newRevenue){
      console.log(JSON.stringify(newRevenue));
      SettingsService.setAppSuccessMessage("Revenue has been recorded.");
      $state.go("tab.revenue-list", {focusMonth: $scope.focusMonth.getTime()});        
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add revenue record.");
    });

  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

})

.controller('BalanceSheetCtrl', function($scope, $http, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService) {
  console.log("Balance sheet controller ");
  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading community balance sheet...<ion-spinner/></p>"
  });

  FinancialService.getAvailableBalanceSheetMonths(Parse.User.current().get("residency")).then(function(availableBalanceSheets) {
    $scope.availableBalanceSheets=availableBalanceSheets;    
    if($stateParams.focusMonth==0) {
      $scope.focusMonth=new Date($scope.availableBalanceSheets[0]);
    } else {
      $scope.focusMonth=new Date(parseInt($stateParams.focusMonth));  
    }
    console.log("Focus month : " + $scope.focusMonth);
    
    FinancialService.getMonthlyBalanceSheet(Parse.User.current().get("residency"), $scope.focusMonth).then(function(balanceSheet) {

      var revenueList=balanceSheet[0];
      $scope.revenueTotal=0;
      for(var i=0;i<revenueList.length;i++) {
        $scope.revenueTotal+=revenueList[i].get("revenueAmount");
      }

      var expenseList=balanceSheet[1];
      $scope.expenseTotal=0;
      for(var i=0;i<expenseList.length;i++) {
        $scope.expenseTotal+=expenseList[i].get("expenseAmount");
      }

      // Remove projected balance sheet
      for(var i=0;i<$scope.availableBalanceSheets.length;i++) {
        var balanceSheetDate=new Date($scope.availableBalanceSheets[i]);
        if(balanceSheetDate.getMonth()==$scope.focusMonth.getMonth() && 
            balanceSheetDate.getFullYear()==$scope.focusMonth.getFullYear()) {
          $scope.availableBalanceSheets.splice(i, 1);
          break;
        }
      }

      $ionicLoading.hide();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unabe to get your community balance sheet");
      $ionicLoading.hide();
    });
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to identify available balance sheets");
      $ionicLoading.hide();    
  });

})

.controller('ReservesDetailCtrl', function($scope, $http, $stateParams, SettingsService, AccountService, RegionService, FinancialService) {
  console.log("Reserves detail controller ");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();

  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.currentReserve=region.get("reserve");
    console.log("current reserve : " + JSON.stringify($scope.currentReserve));
  }, function(error) {
    console.log("Unable to get reserves details of this community.");
  });  

  $scope.getAllReserveAudit=function() {
    FinancialService.getAllReserveAudit(Parse.User.current().get("residency")).then(function(reserveAuditList) {
      console.log("Reserve Audit list : " + JSON.stringify(reserveAuditList));
      $scope.reserveAuditList=reserveAuditList;
      $scope.$apply();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get reserves details of this community.");
    });
  };

  $scope.getAllReserveAudit();  

  $scope.deleteReserveAudit=function(index) {
    FinancialService.deleteReserveAudit($scope.reserveAuditList[index]).then(function(reserveAudit) {
      $scope.controllerMessage=SettingsService.getControllerSuccessMessage("Reserve audit entry has been deleted.");      
      $scope.getAllReserveAudit();
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
    if($scope.input.reserveAmount==null || $scope.input.reserveAmount.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter reserve amount.");
      return;
    }

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

.controller('DuesListCtrl', function($scope, $http, SettingsService, FinancialService, AccountService, $ionicLoading, LogService) {
  console.log("Dues List controller");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading community dues...<ion-spinner/></p>"
  });
  FinancialService.getAllDues(Parse.User.current().get("residency")).then(function(duesList) {
    if(duesList!=null && duesList.length>0) {
      $scope.currentDues=FinancialService.getCurrentDues(duesList);
      $scope.upcomingDues=FinancialService.getUpcomingDues(duesList);
      $scope.duesHistory=FinancialService.getDuesHistory(duesList);
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Dues have not setup for this community.");
    }
    $scope.$apply();        
    $ionicLoading.hide();          
  }, function(error) {
    $ionicLoading.hide();    
    LogService.log({type:"ERROR", message: "Dues list failure path" + JSON.stringify(error)});   
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
    if($scope.input.effectiveMonth==null) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter effective month.");
      return;
    }
    if($scope.input.maintDues==null || $scope.input.maintDues.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter maintenance dues amount.");
      return;
    }

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
