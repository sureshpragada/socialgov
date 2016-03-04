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
      $scope.noOfPaymentsInHistory=paymentList.length;
      if(paymentList[0].get("status")=="COMPLETED") {
        $scope.paymentStatus="Paid";          
        $scope.paymentAmount=paymentList[0].get("revenueAmount");
      } else if(paymentList[0].get("status")=="PENDING") {
        $scope.paymentStatus="Unpaid";  
        $scope.paymentAmount=paymentList[0].get("revenueAmount");
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
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getBalanceSheetByObjectId($stateParams.balanceSheetId).then(function(balanceSheet){
    $scope.focusBalanceSheet=balanceSheet;

    FinancialService.getBalanceSheetExpenses(Parse.User.current().get("residency"), $scope.focusBalanceSheet).then(function(expenseList){
      if(expenseList==null || expenseList.length<=0) {
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Expenses are not found in your community.");
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
  }, function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to find balance sheet.");
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
    $scope.removeExpenseReceipt=$scope.expenseRecord.get("balanceSheet").get("status")=="OPEN"?true:false;
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

.controller('RevenueListCtrl', function($scope, $http, $state, SettingsService, FinancialService, $stateParams, AccountService, $ionicLoading) {
  console.log("Revenue List controller " + $stateParams.balanceSheetId);
  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading expenses list...<ion-spinner/></p>"
  });    
  $scope.appMessage=SettingsService.getAppMessage();    
  $scope.isAdmin=AccountService.canUpdateRegion();

  FinancialService.getBalanceSheetByObjectId($stateParams.balanceSheetId).then(function(balanceSheet){
    $scope.focusBalanceSheet=balanceSheet;
    $scope.homeOwnerPaymentList=[];
    $scope.otherRevenueList=[];

    FinancialService.getBalanceSheetRevenues(Parse.User.current().get("residency"), $scope.focusBalanceSheet).then(function(revenueList){
      if(revenueList==null || revenueList.length<=0) {
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Revenue entries are not found in your community.");
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
      $ionicLoading.hide();
    },function(error){
      $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to retrieve revenue records.");
      $ionicLoading.hide();
    });    
  }, function(error){
    $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to find balance sheet.");
    $ionicLoading.hide();    
  });  

  $scope.goTo=function(index) {
    if($scope.focusBalanceSheet.get("status")=="OPEN" && $scope.isAdmin) {
      if($scope.homeOwnerPaymentList[index].get("status")=="PENDING") {
        SettingsService.setPageTransitionData({
          homeNo: $scope.homeOwnerPaymentList[index].get("homeNo"), 
          revenueId: $scope.homeOwnerPaymentList[index].id
        });
        $state.go("tab.manage-revenue", {balanceSheetId: $scope.focusBalanceSheet.id});      
      } else if($scope.homeOwnerPaymentList[index].get("status")=="COMPLETED") {
        $state.go("tab.revenue-detail", {revenueId: $scope.homeOwnerPaymentList[index].id});      
      }
    } else {
      $state.go("tab.revenue-detail", {revenueId: $scope.homeOwnerPaymentList[index].id});      
    }
  }

})

.controller('ManageRevenueCtrl', function($scope, $http, $stateParams, $state, SettingsService, FinancialService, $ionicHistory, AccountService, $cordovaDialogs) {
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
    
    // Home owner payment
    if($scope.input.category==true) {
      // Initiated via pending payment
      if($scope.editRevenueRecord!=null) {
        $scope.addHomeOwnerPayment();
      } else {
        // Initiated via add revenue, check whether pending payment exists for this home, if yes, associate this payment to the pending
        FinancialService.getMyPaymentHistory(Parse.User.current().get("residency"), $scope.input.homeNo).then(function(paymentList){
          for(var i=0;i<paymentList.length;i++) {
            if(paymentList[i].get("status")=="PENDING" && $scope.focusBalanceSheet.id==paymentList[i].get("balanceSheet").id) {
              // Found pending payment to apply
              $scope.editRevenueRecord=paymentList[i];
              break;  
            }
          }
          if($scope.editRevenueRecord!=null) {
            $scope.addHomeOwnerPayment();
          } else {
            $scope.addNonHomeOwnerPayment();
          }
        }, function(error){
          $scope.addNonHomeOwnerPayment();
        });
      }
    } else {
      $scope.addNonHomeOwnerPayment();
    }
  };

  $scope.addHomeOwnerPayment=function() {
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
  };

  $scope.addNonHomeOwnerPayment=function() {
    FinancialService.addRevenue($scope.input).then(function(newRevenue){
      console.log(JSON.stringify(newRevenue));
      SettingsService.setAppSuccessMessage("Revenue has been recorded.");
      $state.go("tab.revenue-list", {balanceSheetId: newRevenue.get("balanceSheet").id});        
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to add revenue record.");
    });      
  };

  // $scope.changeHomeNumber=function() {
  //   // ng-change="handleActivitySelection()"
  // };

  $scope.editPayment=function() {
    $scope.editRevenueRecord.set("revenueAmount",$scope.input.revenueAmount);
    $scope.editRevenueRecord.set("revenueDate",$scope.input.revenueDate);
    $scope.editRevenueRecord.set("note",$scope.input.note);
    FinancialService.saveRevenue($scope.editRevenueRecord).then(function(success){
      SettingsService.setAppSuccessMessage("Payment record has been updated.");
      AccountService.sendNotificationToHomeOwner($scope.input.homeNo, "Your maintenance payment has been updated.");
      $state.go("tab.revenue-list", {balanceSheetId: $scope.editRevenueRecord.get("balanceSheet").id});        
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to edit revenue record.");
    });
  };

  $scope.deletePayment=function() {
    if(ionic.Platform.isWebView()) {
      $cordovaDialogs.beep(1);
    }
    $cordovaDialogs.confirm('Do you want to delete this pending payment?', 'Delete Payment', ['Yes','Never mind'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        var balanceSheetId=$scope.editRevenueRecord.get("balanceSheet").id;
         FinancialService.deleteRevenueRecord($scope.editRevenueRecord).then(function(success){
            SettingsService.setAppSuccessMessage("Successfully deleted the revenue record.");
            $state.go("tab.revenue-list", {balanceSheetId: balanceSheetId});
         },function(error){
            $scope.controllerMessage = SettingsService.getControllerErrorMessage("Unable to delete the record");
         }); 
      } else {
        console.log("Canceled delete of payment");
      }
    });
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
    if($scope.balanceSheetList!=null && $scope.balanceSheetList.length>=0) {
      $scope.openBalanceSheetList=FinancialService.getOpenBalanceSheetFromAvailableBalanceSheets($scope.balanceSheetList);
      if($scope.openBalanceSheetList.length==0) {
        $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Track your revenue and expenses by starting a new balance sheet.");
      } else if($scope.openBalanceSheetList.length==2 && $scope.isAdmin) {
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Two balance sheets are allowed to be open at any time.");      
      }
    } 
    // else if($scope.balanceSheetList!=null && $scope.balanceSheetList.length==0) {
    //     $scope.controllerMessage=SettingsService.getControllerIdeaMessage("Start tracking your revenue and expenses by opening balance sheet.");
    // }
    $ionicLoading.hide();
  }, function(error) {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to load balance sheets");
    $ionicLoading.hide();    
  });

})

.controller('BalanceSheetCtrl', function($scope, $http, $state, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService, LogService, $q, $cordovaDialogs) {
  console.log("Balance sheet controller " + $stateParams.balanceSheetId);
  $scope.appMessage=SettingsService.getAppMessage();
  $scope.isAdmin=AccountService.canUpdateRegion();  
  $scope.user=AccountService.getUser();

  $scope.closeBalanceSheetInput={
    closeInitiated: false,
    deleteInitiated: false,
    carryForwardBalance: false,
    carryForwardHomeOwnerUnpaidBalance: false,
    endDate: new Date(),
    closedBy: $scope.user,
    residency: $scope.user.get("residency")    
  };

  $ionicLoading.show({
    template: "<p class='item-icon-left'>Loading balance sheet...<ion-spinner/></p>"
  });
  FinancialService.getBalanceSheets($scope.user.get("residency")).then(function(availableBalanceSheets) {    
    $scope.balanceSheet=FinancialService.getBalanceSheetFromAvaialableBalanceSheets($stateParams.balanceSheetId, availableBalanceSheets);
    $scope.isCloseAllowed=true;    
    if($scope.balanceSheet.get("status")=="CLOSED") {
      $scope.isCloseAllowed=false;    
      $scope.controllerMessage=SettingsService.getControllerInfoMessage("Closed balance sheets do not allow any edits to revenue and expense entries.");
    }

    $scope.openBalanceSheets=FinancialService.getOpenBalanceSheetFromAvailableBalanceSheets(availableBalanceSheets);
    if($scope.openBalanceSheets.length==2) {
      $scope.closeBalanceSheetInput.carryForwardBalance=true;
      $scope.closeBalanceSheetInput.carryForwardHomeOwnerUnpaidBalance=true;
      // Allow only previous sheet to be closed
      if($scope.balanceSheet.get("startDate").getTime()>$scope.getOtherBalanceSheet().get("startDate").getTime()) {
        $scope.isCloseAllowed=false;   
        $scope.controllerMessage=SettingsService.getControllerInfoMessage("Balance sheet will be allowed to close upon closing of older balance sheet.");                        
      } 
    }

    FinancialService.getMonthlyBalanceSheet(Parse.User.current().get("residency"), $scope.balanceSheet).then(function(balanceSheetEntries) {

      $scope.revenueList=balanceSheetEntries[0];
      $scope.homeOwnerUnpaidPaymentList=[];
      $scope.revenueTotal=0;
      for(var i=0;i<$scope.revenueList.length;i++) {
        if(($scope.revenueList[i].get("revenueCategory")=="MAINT_DUES" && $scope.revenueList[i].get("status")=="COMPLETED")
          || $scope.revenueList[i].get("revenueCategory")=="OTHER") {
          $scope.revenueTotal+=$scope.revenueList[i].get("revenueAmount");
        }
        if($scope.revenueList[i].get("revenueCategory")=="MAINT_DUES" && $scope.revenueList[i].get("status")=="PENDING") {
          $scope.homeOwnerUnpaidPaymentList.push($scope.revenueList[i]);
        }
      }

      $scope.expenseList=balanceSheetEntries[1];
      $scope.expenseTotal=0;
      for(var i=0;i<$scope.expenseList.length;i++) {
        $scope.expenseTotal+=$scope.expenseList[i].get("expenseAmount");
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
    if(action==true) {
      $scope.closeBalanceSheetInput.deleteInitiated=false;
    }    
  };

  $scope.closeBalanceSheet=function() {
    $ionicLoading.show({
      template: "<p class='item-icon-left'>Closing balance sheet...<ion-spinner/></p>"
    });
    FinancialService.closeBalanceSheet($scope.balanceSheet.id, $scope.closeBalanceSheetInput).then(function(closedBalanceSheet){      
      var promiseArray=[];
      var forwardingBalanceSheet=$scope.getOtherBalanceSheet();      

      if($scope.closeBalanceSheetInput.carryForwardBalance==true) {
        promiseArray.push(FinancialService.carryForwardFinalBalanceAmountToNextBalanceSheet(forwardingBalanceSheet, $scope.revenueTotal-$scope.expenseTotal));        
      } 

      if($scope.closeBalanceSheetInput.carryForwardHomeOwnerUnpaidBalance==true && $scope.homeOwnerUnpaidPaymentList.length>0) {
        promiseArray.push(FinancialService.carryForwardUnpaidPaymentsToNextBalanceSheet(forwardingBalanceSheet, $scope.homeOwnerUnpaidPaymentList));        
      } 

      if(promiseArray.length>0) {
        $q.all(promiseArray).then(function(results){
          $scope.gotoBalanceSheetWithMessage("Balance sheet has been closed and balance has been forwarded.");          
        },function(error){
          $scope.gotoBalanceSheetWithMessage("Balance sheet is closed and unable to carry forward balance. Please update revenue entries manually.");
        });
      } else {
        $scope.gotoBalanceSheetWithMessage("Balance sheet has been closed and balance has been forwarded.");
      }
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to close balance sheet");
      $ionicLoading.hide();    
    });    
  };

  $scope.gotoBalanceSheetWithMessage=function(message) {
    SettingsService.setAppInfoMessage(message);
    $ionicLoading.hide();    
    $state.go("tab.balance-sheet-list");        
  };

  $scope.getOtherBalanceSheet=function() {
    for(var i=0;i<$scope.openBalanceSheets.length;i++) {
      if($scope.openBalanceSheets[i].id!=$scope.balanceSheet.id) {
        return $scope.openBalanceSheets[i];
      }
    }
    return null;
  };

  $scope.initiateDeleteBalanceSheet=function(action) {
    $scope.closeBalanceSheetInput.deleteInitiated=action;
    if(action==true) {
      $scope.closeBalanceSheetInput.closeInitiated=false;
    }
  };

  $scope.deleteBalanceSheet=function() {
    $ionicLoading.show({
      template: "<p class='item-icon-left'>Deleting balance sheet...<ion-spinner/></p>"
    });    
    $q.all([
      $scope.balanceSheet.destroy(),
      Parse.Object.destroyAll($scope.revenueList),
      Parse.Object.destroyAll($scope.expenseList)
      ]).then(function(results){
      FinancialService.refreshBalanceSheetCache();
      $scope.gotoBalanceSheetWithMessage("Balance sheet has been deleted.");          
    },function(error){
      FinancialService.refreshBalanceSheetCache();
      $scope.gotoBalanceSheetWithMessage("Partial failures with deleting the balance sheet and it will be cleaned up offline.");
    });
  };

})

.controller('StartBalanceSheetCtrl', function($scope, $http, $state, $stateParams, SettingsService, AccountService, $ionicLoading, FinancialService, $ionicHistory, LogService) {
  console.log("Start Balance sheet controller ");
  $scope.user=Parse.User.current();
  $scope.balanceSheets=[];
  $scope.input={
    generateHomeOwnerPayments: true,
    startDate: new Date().firstDayOfMonth(), // TODO :: Populate next month here
    openedBy: $scope.user,
    residency: $scope.user.get("residency")
  };

  // Start date calculation
  FinancialService.getBalanceSheets($scope.user.get("residency")).then(function(balanceSheets){
    if(balanceSheets!=null && balanceSheets.length>0) {
      $scope.balanceSheets=balanceSheets;
      $scope.input.startDate=$scope.balanceSheets[0].get("startDate").addMonths(1);      
    }
  },function(error){
    console.log("Unable to get balance sheets to calculate start date of balance sheet.");
  });

  // Dues calculation
  FinancialService.getAllDues($scope.user.get("residency")).then(function(duesList) {    
    if(duesList!=null && duesList.length>0) {
      var dues=FinancialService.getCurrentDues(duesList);
      if(dues==null) {
        dues=FinancialService.getUpcomingDues(duesList);
      }
      if(dues!=null) {
        $scope.input.maintDues=dues.get("maintDues");
      }
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

    if(FinancialService.isBalanceSheetExistsInThisMonth($scope.balanceSheets, $scope.input.startDate)) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Balance sheet exists for this month. Please open balance sheet for upcoming month.");
      return;      
    }

    if($scope.balanceSheets.length>0 && $scope.input.startDate.getTime()<$scope.balanceSheets[0].get("startDate").getTime()) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Balance sheet can be opened only for upcoming months.");
      return;      
    } 

    $ionicLoading.show({
      template: "<p class='item-icon-left'>Creating balance sheet...<ion-spinner/></p>"
    });
    $scope.input.startDate=$scope.input.startDate.endOfTheDay();
    FinancialService.openBalanceSheet($scope.input).then(function(newBalanceSheet) {
      if($scope.input.generateHomeOwnerPayments==true) {
        FinancialService.generateHomeOwnerPayments(newBalanceSheet, $scope.input.maintDues).then(function(newRevenueEntries){
          $scope.gotoBalanceSheetOnSuccess("New balance sheet has been opened.");
        }, function(error) {
          SettingsService.setAppInfoMessage("Home owner payment generation is failed in new balance sheet. System will attempt to create them offline.");
          LogService.log({type:"ERROR", message: "Failed to create home owner payments " + JSON.stringify(error) + " residency : " + newBalanceSheet.get("residency") + " Balance sheet ID : " + newBalanceSheet.id}); 
          $ionicLoading.hide();    
          // $state.go("tab.balance-sheet-list");
          $ionicHistory.goBack(-1);
        });
      } else {
        $scope.gotoBalanceSheetOnSuccess("New balance sheet has been created.");
      }
    }, function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to open new balance sheet");
      $ionicLoading.hide();    
    });
  };

  $scope.cancel=function() {
    $ionicHistory.goBack(-1);
  };

  $scope.gotoBalanceSheetOnSuccess=function(message) {
    SettingsService.setAppSuccessMessage(message);
    $ionicLoading.hide();    
    // $state.go("tab.balance-sheet-list");
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
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get current reserves of your community.");
  });  

  $scope.getAllReserveAudit=function() {
    FinancialService.getAllReserveAudit(Parse.User.current().get("residency")).then(function(reserveAuditList) {
      // console.log("Reserve Audit list : " + JSON.stringify(reserveAuditList));
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

.controller('ManageReservesCtrl', function($scope, $http, $stateParams, $state, SettingsService, RegionService, FinancialService, LogService) {
  console.log("Manage Reserves controller");
  $scope.input={
    createdBy: Parse.User.current(),
    residency: Parse.User.current().get("residency"),
    effectiveMonth: new Date()
  };
  RegionService.getRegion(Parse.User.current().get("residency")).then(function(region) {
    $scope.region=region;
    if($scope.region.get("reserve")!=null) {
      $scope.input.reserveAmount=$scope.region.get("reserve").reserveAmount;
    }
  }, function(error) {  
    LogService.log({type:"ERROR", message: "Unable to get region for reserve update " + JSON.stringify(error)});   
    SettingsService.setAppErrorMessage("Unable to get community current reserves to take further updates. Please try again later.");
    $state.go("tab.reserves-detail");    
  });  

  $scope.updateReserve=function() {
    if($scope.input.reserveAmount==null || $scope.input.reserveAmount.length<=0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter reserve amount.");
      return;
    }

    RegionService.updateReserve($scope.region, $scope.input).then(function(region) {      
      FinancialService.updateReserve($scope.input).then(function(reserveAudit) {
        SettingsService.setAppSuccessMessage("Reserve has been recorded.");
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
