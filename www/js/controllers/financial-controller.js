angular.module('starter.controllers')

.controller('FinancialCtrl', function($scope, $http, $ionicLoading, FinancialService, SettingsService, RegionService, AccountService) {
  console.log("Financial controller");

  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.user=Parse.User.current();
  $scope.isAdmin=AccountService.canUpdateRegion();
  $scope.regionSettings=RegionService.getRegionSettings($scope.user.get("residency"));    

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading financial snapshot...<ion-spinner/></p>"
  });
  FinancialService.getFinancialSnapshot($scope.user.get("residency"), $scope.user.get("homeNo")).then(function(results){
    // Calculate payment status
    //  TODO :: if($scope.regionSettings.financialMgmt=="SELF") {
    var paymentList=results[0];
    $scope.paymentStatus="NA";    
    if(paymentList!=null && paymentList.length>0) {
      if(paymentList[0].get("status")=="COMPLETED") {
        $scope.paymentStatus="Paid";  
      } else if(paymentList[0].get("status")=="PENDING") {
        $scope.paymentStatus="Unpaid";  
      } 
    }

    // Calculate Dues
    var duesList=results[1];
    if(duesList!=null) {
      $scope.currentDues=FinancialService.getCurrentDues(duesList);
      if($scope.currentDues==null) {
        $scope.currentDues=FinancialService.getUpcomingDues(duesList);
      }
    } else {
      $scope.ideaMessage=SettingsService.getControllerIdeaMessage("Get started your finances by setting up your community maintenance dues.");
    }

    // Calculate reserves
    $scope.reserve="NA";
    var region=results[2];
    var currentReserve=region.get("reserve");
    if(currentReserve!=null) {
      $scope.reserve=currentReserve.reserveAmount;
    }    

    $ionicLoading.hide();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get financial snapshot of your community.");
    $ionicLoading.hide();
  });

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

.controller('ExpenseListCtrl', function($scope, $http, $stateParams, SettingsService, FinancialService, AccountService, $ionicLoading) {
  console.log("Expense List controller " + $stateParams.balanceSheetId);
  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading expenses list...<ion-spinner/></p>"
  });  
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.focusBalanceSheet=FinancialService.createBalanceSheetEntityWithObjectId($stateParams.balanceSheetId);  
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getBalanceSheetExpenses(Parse.User.current().get("residency"), $scope.focusBalanceSheet).then(function(expenseList){
    if(expenseList==null || expenseList.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Expenses have not found in your community.");
    } else {
      $scope.expenseList = expenseList;
    }
    // console.log("Expense list : " + JSON.stringify($scope.expenseList));
    $scope.$apply();
    $ionicLoading.hide();
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve your community expenses list.");
    $ionicLoading.hide();
  });

})

.controller('ExpenseDetailCtrl', function($scope, $http, $stateParams, $ionicModal, $cordovaDialogs, $state, SettingsService, AccountService, FinancialService, PictureManagerService) {
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
    if(ionic.Platform.isWebView()) {
      $cordovaDialogs.beep(1);
    }
    $cordovaDialogs.confirm('Do you want to remove this expense?', 'Remove Expense', ['Remove','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
         FinancialService.deleteExpenseRecord($scope.expenseRecord).then(function(deletedExpenseRecord){
            SettingsService.setAppSuccessMessage("Successfully deleted the expense record.");
            $state.go("tab.expense-list", {balanceSheetId: deletedExpenseRecord.get("balanceSheet").id});
         },function(error){
            $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to delete expense record.");
         }); 
      } else {
        console.log("Canceled removal of expense");
      }
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

.controller('ManageExpenseCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, $ionicHistory) {
  console.log("Manage Expense controller " + $stateParams.balanceSheetId);
  $scope.availableCategories=FinancialService.getExpenseCategories();
  $scope.focusBalanceSheet=FinancialService.createBalanceSheetEntityWithObjectId($stateParams.balanceSheetId);  
  $scope.input={
    expenseDate: new Date(),
    category: $scope.availableCategories[0],
    balanceSheet: $scope.focusBalanceSheet
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
      $state.go("tab.expense-list", {balanceSheetId: newExpense.get("balanceSheet").id});        
    },function(error){
      $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to record the expense.");
    });
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
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
        category: FinancialService.getSelectedExpenseCategory($scope.availableCategories, $scope.expenseRecord.get("expenseCategory"))
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
      $state.go("tab.expense-detail", {expenseId: savedExpenseRecord.id});
      // $state.go("tab.expense-list", {balanceSheetId: savedExpenseRecord.get("expenseDate").getTime()});
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit expense record.");
    });
  };
})

.controller('PaymentDetailCtrl', function($scope, $http, $stateParams, $state, $cordovaDialogs, SettingsService, FinancialService, AccountService) {  
  console.log("Payment detail controller " + $stateParams.revenueId);
  $scope.appMessage=SettingsService.getAppMessage();    
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
    if(ionic.Platform.isWebView()) {
      $cordovaDialogs.beep(1);
    }
    $cordovaDialogs.confirm('Do you want to remove this payment?', 'Remove Payment', ['Remove','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
         FinancialService.deleteRevenueRecord($scope.revenueRecord).then(function(success){
            SettingsService.setAppSuccessMessage("Successfully deleted the revenue record.");
            $state.go("tab.revenue-list", {balanceSheetId: $scope.revenueRecord.get("balanceSheet").id});
         },function(error){
            $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to delete the record");
         }); 
      } else {
        console.log("Canceled removal of revenue");
      }
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
      $state.go("tab.revenue-detail",{revenueId:$stateParams.revenueId});
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit revenue record.");
    });
  };

  $scope.cancel=function() {
    $state.go("tab.revenue-detail", {revenueId: $stateParams.revenueId});
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
  console.log("Revenue List controller " + $stateParams.balanceSheetId);
  $scope.appMessage=SettingsService.getAppMessage();  
  $scope.focusBalanceSheet=FinancialService.createBalanceSheetEntityWithObjectId($stateParams.balanceSheetId);  
  $scope.isAdmin=AccountService.canUpdateRegion();

  $scope.homeOwnerPaymentList=[];
  $scope.otherRevenueList=[];

  FinancialService.getBalanceSheetRevenues(Parse.User.current().get("residency"), $scope.focusBalanceSheet).then(function(revenueList){
    if(revenueList==null || revenueList.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Revenue entries have not found in your community.");
    } else {
      for(var i=0;i<revenueList.length;i++) {
        if(revenueList[i].get("revenueCategory")=="MAINT_DUES") {
          $scope.homeOwnerPaymentList.push(revenueList[i]);
        } else {
          $scope.otherRevenueList.push(revenueList[i]);
        }
      }
    }
    $scope.$apply();
  },function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to retrieve revenue records.");
  });

  $scope.goTo=function(index) {
    if($scope.homeOwnerPaymentList[index].get("status")=="PENDING") {
      SettingsService.setPageTransitionData({
        homeNo: $scope.homeOwnerPaymentList[index].get("homeNo"), 
        revenueId: $scope.homeOwnerPaymentList[index].id
      });
      $state.go("tab.manage-revenue", {balanceSheetId: $scope.focusBalanceSheet.id});      
    } else if($scope.homeOwnerPaymentList[index].get("status")=="COMPLETED") {
      $state.go("tab.revenue-detail", {revenueId: $scope.homeOwnerPaymentList[index].id});      
    }
  }
})

.controller('ManageRevenueCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, $ionicHistory, AccountService) {
  console.log("Manage Revenue controller " + $stateParams.balanceSheetId);
  $scope.focusBalanceSheet=FinancialService.createBalanceSheetEntityWithObjectId($stateParams.balanceSheetId);  
  $scope.input={
    revenueDate: new Date(),
    category: true,
    balanceSheet: $scope.focusBalanceSheet,
    status: "COMPLETED"
  };

  $scope.pageTransitionData=SettingsService.getPageTransitionData();
  if($scope.pageTransitionData!=null) {
    FinancialService.getRevenueRecord($scope.pageTransitionData.revenueId).then(function(revenueRecord){
      $scope.editRevenueRecord=revenueRecord[0];
      $scope.availableHomes=[{label: $scope.pageTransitionData.homeNo, value: $scope.pageTransitionData.homeNo}];      
      $scope.input.home=$scope.availableHomes[0];    
      $scope.input.revenueAmount=$scope.editRevenueRecord.get("revenueAmount");
    }, function(error){
      console.log("Unable to get revenue record");
    });
  } else {
    AccountService.getListOfHomesInCommunity(Parse.User.current().get("residency")).then(function(homesList) {
      if(homesList!=null && homesList.length>0) {
        $scope.availableHomes=homesList;      
        $scope.input.home=$scope.availableHomes[0];    
      }
    }, function(error) {
      console.log("Unable to get available home number");
    });

    if($scope.pageTransitionData==null) {
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
    }

  }

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
    
    if($scope.input.category==true && $scope.pageTransitionData!=null) {
      $scope.editRevenueRecord.set("revenueAmount",$scope.input.revenueAmount);
      $scope.editRevenueRecord.set("revenueDate",$scope.input.revenueDate);
      $scope.editRevenueRecord.set("note",$scope.input.note);
      $scope.editRevenueRecord.set("status","COMPLETED");
      FinancialService.saveRevenue($scope.editRevenueRecord).then(function(success){
        SettingsService.setAppSuccessMessage("Revenue has been recorded.");
        AccountService.sendNotificationToHomeOwner($scope.input.homeNo, "Your maintenance payment has been recorded.");
        $state.go("tab.revenue-list", {balanceSheetId: $scope.editRevenueRecord.get("balanceSheet").id});        
      },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit revenue record.");
      });
    } else {
      FinancialService.addRevenue($scope.input).then(function(newRevenue){
        console.log(JSON.stringify(newRevenue));
        SettingsService.setAppSuccessMessage("Revenue has been recorded.");
        if($scope.input.category==true) {
          AccountService.sendNotificationToHomeOwner($scope.input.homeNo, "Your maintenance payment has been recorded.");  
        }        
        $state.go("tab.revenue-list", {balanceSheetId: newRevenue.get("balanceSheet").id});        
      },function(error){
        $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add revenue record.");
      });
    }

  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

})

.controller('BalanceSheetListCtrl', function($scope, $http, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService) {
  console.log("Balance sheet list controller ");
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading community balance sheets...<ion-spinner/></p>"
  });
  FinancialService.getBalanceSheets(Parse.User.current().get("residency")).then(function(availableBalanceSheets) {
    $scope.balanceSheetList=availableBalanceSheets;            
    if($scope.balanceSheetList!=null && $scope.balanceSheetList.length>0) {
      $scope.openBalanceSheetList=FinancialService.getOpenBalanceSheetFromAvailableBalanceSheets($scope.balanceSheetList);
      if($scope.openBalanceSheetList.length==0) {
        $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Start tracking your revenue and expenses by opening balance sheet.");
      } else if($scope.openBalanceSheetList.length==2) {
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Only two balance sheets are allowed to be open at any time.");      
      }
    }
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to load balance sheets");
    $ionicLoading.hide();    
  });

})

.controller('BalanceSheetCtrl', function($scope, $http, $state, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService, LogService) {
  console.log("Balance sheet controller " + $stateParams.balanceSheetId);
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();  
  $scope.user=AccountService.getUser();

  $scope.closeBalanceSheetInput={
    closeInitiated: false,
    carryForwardBalance: false,
    endDate: new Date(),
    closedBy: $scope.user,
    residency: $scope.user.get("residency")    
  };

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading balance sheet...<ion-spinner/></p>"
  });
  FinancialService.getBalanceSheets($scope.user.get("residency")).then(function(availableBalanceSheets) {
    $scope.openBalanceSheets=FinancialService.getOpenBalanceSheetFromAvailableBalanceSheets(availableBalanceSheets);
    if($scope.openBalanceSheets.length==2) {
      $scope.closeBalanceSheetInput.carryForwardBalance=true;
    }
    $scope.balanceSheet=FinancialService.getBalanceSheetFromAvaialableBalanceSheets($stateParams.balanceSheetId, availableBalanceSheets);

    FinancialService.getMonthlyBalanceSheet(Parse.User.current().get("residency"), $scope.balanceSheet).then(function(balanceSheetEntries) {

      var revenueList=balanceSheetEntries[0];
      $scope.revenueTotal=0;
      for(var i=0;i<revenueList.length;i++) {
        if((revenueList[i].get("revenueCategory")=="MAINT_DUES" && revenueList[i].get("status")=="COMPLETED")
          || revenueList[i].get("revenueCategory")=="OTHER")
        $scope.revenueTotal+=revenueList[i].get("revenueAmount");
      }

      var expenseList=balanceSheetEntries[1];
      $scope.expenseTotal=0;
      for(var i=0;i<expenseList.length;i++) {
        $scope.expenseTotal+=expenseList[i].get("expenseAmount");
      }

      $ionicLoading.hide();
    }, function(error) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unabe to get balance sheet entries.");
      $ionicLoading.hide();
    });
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve balance sheet.");
      $ionicLoading.hide();    
  });

  $scope.initiateCloseBalanceSheet=function(action) {
    $scope.closeBalanceSheetInput.closeInitiated=action;
  };

  $scope.closeBalanceSheet=function() {
    $ionicLoading.show({
      template: "<p class='item-icon-left'>Closing balance sheet...<ion-spinner/></p>"
    });
    FinancialService.closeBalanceSheet($scope.balanceSheet.id, $scope.closeBalanceSheetInput).then(function(closedBalanceSheet){      
      if($scope.closeBalanceSheetInput.carryForwardBalance==true) {
        var forwardingBalanceSheet=$scope.getOtherBalanceSheet();
        FinancialService.addCarryForwardEntryToBalanceSheet(forwardingBalanceSheet, $scope.revenueTotal-$scope.expenseTotal).then(function(carryForwardedRevenue) {
          SettingsService.setAppSuccessMessage("Balance sheet has been closed and balance has been forwarded.");
          $ionicLoading.hide();    
          $state.go("tab.balance-sheet-list");
        }, function(error) {
          SettingsService.setAppInfoMessage("Balance sheet is closed and unable to carry forward balance. Please add revenue entry manually.");
          $ionicLoading.hide();    
          $state.go("tab.balance-sheet-list");
        });
      } else {
        $ionicLoading.hide();    
      }
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to close balance sheet");
      $ionicLoading.hide();    
    });    
  };

  $scope.getOtherBalanceSheet=function() {
    for(var i=0;i<$scope.openBalanceSheets.length;i++) {
      if($scope.openBalanceSheets[i].id!=$scope.balanceSheet.id) {
        return $scope.openBalanceSheets[i];
      }
    }
    return null;
  };

})

.controller('StartBalanceSheetCtrl', function($scope, $http, $state, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService, $ionicHistory, LogService) {
  console.log("Start Balance sheet controller ");
  $scope.user=Parse.User.current();
  $scope.input={
    generateHomeOwnerPayments: true,
    startDate: new Date().firstDayOfMonth(),
    openedBy: $scope.user,
    residency: $scope.user.get("residency")
  };

  // Dues calculation
  FinancialService.getAllDues(Parse.User.current().get("residency")).then(function(duesList) {    
    if(duesList!=null) {
      var dues=FinancialService.getCurrentDues(duesList);
      if(dues==null) {
        dues=FinancialService.getUpcomingDues(duesList);
      }
      $scope.input.maintDues=dues.get("maintDues");
    } else {
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Maintenance dues need to be setup to generate monthly home owner payments.");  
    } 
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to retrieve dues of this community to generate monthly home owner payments.");
  });    

  $scope.startBalanceSheet=function() {
    
    if($scope.input.generateHomeOwnerPayments==true && ($scope.input.maintDues==null ||  $scope.input.maintDues.length<1)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter maintenance dues.");
      return;
    }

    $ionicLoading.show({
      template: "<p class='item-icon-left'>Creating balance sheet...<ion-spinner/></p>"
    });
    FinancialService.openBalanceSheet($scope.input).then(function(newBalanceSheet) {
      if($scope.input.generateHomeOwnerPayments==true) {
        FinancialService.generateHomeOwnerPayments(newBalanceSheet, $scope.input.maintDues).then(function(newRevenueEntries){
          SettingsService.setAppSuccessMessage("New balance sheet has been created.");
          $ionicLoading.hide();    
          $state.go("tab.balance-sheet-list");
        }, function(error) {
          SettingsService.setAppInfoMessage("Home owner payment generation is failed in new balance sheet. System will attempt to create them offline.");
          LogService.log({type:"ERROR", message: "Failed to create home owner payments " + JSON.stringify(error) + " residency : " + newBalanceSheet.get("residency") + " Balance sheet ID : " + newBalanceSheet.id}); 
          $ionicLoading.hide();    
          $state.go("tab.balance-sheet-list");
        });
      } else {
        $ionicLoading.hide();    
      }
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to open new balance sheet");
      $ionicLoading.hide();    
    });
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

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

.controller('ManageDuesCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, $ionicHistory) {
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

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

})

;
