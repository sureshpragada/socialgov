angular.module('financial.services', [])

.factory('FinancialService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', 'AccountService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, AccountService, $q) {

// Mar 2016 4000.00
// Sep 2015 3000.00
// Jan 2015 2000.00
// Jan 2014 1000.00
// Current date : Jan 23 2016
// Mar 2016 > Jan 23 2016 - Upcoming
// Jan 23 2016 > Sep 2015 & first records - Current
// Jan 23 2016 > [Date] - History

  var balanceSheetCache;
  if (!CacheFactory.get('balanceSheetCache')) {
    balanceSheetCache = CacheFactory('balanceSheetCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Day
      deleteOnExpire: 'none'
    });
  }

  return {
    getBalanceSheets: function(regionUniqueName) {
      var deferred = $q.defer();
      var cachedObjectInfo=balanceSheetCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(balanceSheetCache.get(regionUniqueName));  
      } else {
        var BalanceSheet = Parse.Object.extend("BalanceSheet");
        var query = new Parse.Query(BalanceSheet);
        query.equalTo("residency",regionUniqueName);
        query.descending("createdAt");
        query.find(function(balanceSheets) {
            balanceSheetCache.remove(regionUniqueName);
            balanceSheetCache.put(regionUniqueName, balanceSheets);          
            deferred.resolve(balanceSheets);
          }, function(error) {
            if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
              deferred.resolve(balanceSheetCache.get(regionUniqueName));  
            } else {
              deferred.reject(error);
            }
          }); 
      }
      return deferred.promise;
    },    
    setupDues: function(inputDues) {
      var Dues = Parse.Object.extend("Dues");
      var dues=new Dues();
      dues.set("maintDues", inputDues.maintDues);
      dues.set("effectiveMonth", inputDues.effectiveMonth);
      dues.set("notes", inputDues.notes);
      dues.set("residency", inputDues.residency);
      dues.set("createdBy", inputDues.createdBy);
      return dues.save();
    },
    updateDues: function(duesId, inputDues) {
      var Dues = Parse.Object.extend("Dues");
      var dues=new Dues();
      dues.set("maintDues", inputDues.maintDues);
      dues.set("effectiveMonth", inputDues.effectiveMonth);
      dues.set("notes", inputDues.notes);
      dues.set("residency", inputDues.residency);
      dues.set("createdBy", inputDues.createdBy);
      dues.set("objectId", duesId);
      return dues.save();
    },
    getAllDues: function(residency){
      var Dues = Parse.Object.extend("Dues");
      var query = new Parse.Query(Dues);
      query.equalTo("residency",residency);
      query.descending("effectiveMonth");
      return query.find();
    },
    getDuesByObjectId: function(duesObjectId){
      var Dues = Parse.Object.extend("Dues");
      var query = new Parse.Query(Dues);
      query.equalTo("objectId", duesObjectId);
      return query.first();
    },    
    getCurrentDues: function(duesList) {
      for(var i=0;i<duesList.length;i++) {
        if(new Date().getTime()>duesList[i].get("effectiveMonth").getTime()) {
          return duesList[i];
        }
      }
      return null;
    },
    getUpcomingDues: function(duesList) {
      if(duesList!=null && duesList.length>0 && new Date().getTime()<duesList[0].get("effectiveMonth").getTime()) {
        return duesList[0];
      } 
      return null;
    },
    getDuesHistory: function(duesList) {
      var historyDues=[];
      for(var i=0;i<duesList.length;i++) {
        if(new Date().getTime()>duesList[i].get("effectiveMonth").getTime()) {
          historyDues.push(duesList[i]);
        }
      }
      return historyDues;
    },
    deleteUpcomingDues: function(upcomingDues) {
      return upcomingDues.destroy();
    },
    updateReserve: function(inputReserve) {
      var ReserveAudit = Parse.Object.extend("ReserveAudit");
      var reserveAudit=new ReserveAudit();
      reserveAudit.set("reserveAmount", inputReserve.reserveAmount);
      reserveAudit.set("effectiveMonth", inputReserve.effectiveMonth);
      reserveAudit.set("notes", inputReserve.notes);
      reserveAudit.set("residency", inputReserve.residency);
      reserveAudit.set("createdBy", inputReserve.createdBy);
      return reserveAudit.save();
    },
    getAllReserveAudit: function(residency){
      var ReserveAudit = Parse.Object.extend("ReserveAudit");
      var query = new Parse.Query(ReserveAudit);
      query.equalTo("residency",residency);
      query.descending("effectiveMonth");
      return query.find();
    },    
    deleteReserveAudit: function(reserveAudit) {
      return reserveAudit.destroy();
    },
    addExpense: function(input) {
      var Expense = Parse.Object.extend("Expense");
      var expense = new Expense();
      expense.set("residency",Parse.User.current().get("residency"));
      expense.set("createdBy",Parse.User.current());
      expense.set("paidTo",input.paidTo!=null?input.paidTo.capitalizeFirstLetter():input.paidTo);
      expense.set("expenseAmount",input.expenseAmount);
      expense.set("expenseDate",input.expenseDate);
      expense.set("reason",input.reason);
      expense.set("expenseCategory",input.category.value);
      expense.set("balanceSheet",input.balanceSheet);
      return expense.save();
    },
    addRevenue: function(input) {
      return this.populateRevenueObjectFromInput(input).save();
    },
    populateRevenueObjectFromInput: function(input) {
      var Revenue = Parse.Object.extend("Revenue");
      var revenue = new Revenue();
      revenue.set("residency",Parse.User.current().get("residency"));
      revenue.set("createdBy",Parse.User.current());
      revenue.set("revenueAmount",input.revenueAmount);
      revenue.set("revenueDate",input.revenueDate);
      revenue.set("note",input.note);
      revenue.set("revenueSource",input.revenueSource);
      revenue.set("revenueCategory",input.category?"MAINT_DUES":"OTHER");
      revenue.set("homeNo",input.homeNo);  
      revenue.set("balanceSheet",input.balanceSheet);                
      revenue.set("status", input.status);
      return revenue;
    },    
    getMyPaymentHistory: function(regionName, homeNo) {
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("residency",regionName);
      query.equalTo("homeNo", homeNo);
      query.equalTo("revenueCategory", "MAINT_DUES");
      query.descending("revenueDate");
      return query.find();
    },
    getCurrentMonthExpenseList: function(regionName){
      var Expense = Parse.Object.extend("Expense");
      var query = new Parse.Query(Expense);
      query.equalTo("residency",regionName);
      query.descending("createdAt");
      return query.find();
    },
    getCurrentMonthRevenueList: function(regionName){
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("residency",regionName);
      query.descending("createdAt");
      return query.find();
    },
    getExpenseRecord: function(id){
      var Expense = Parse.Object.extend("Expense");
      var query = new Parse.Query(Expense);
      query.equalTo("objectId",id);
      return query.find();
    },
    getRevenueRecord: function(id){
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("objectId",id);
      return query.find();
    },
    deleteExpenseRecord: function(expenseRecord){
      return expenseRecord.destroy();
    },
    deleteRevenueRecord: function(revenueRecord){
      return revenueRecord.destroy();
    },
    saveExpense: function(expenseRecord){
      return expenseRecord.save(); 
    },
    getAvailableBalanceSheetMonths: function(regionName) {
      var deferred = $q.defer();
      RegionService.getRegion(regionName).then(function(region) {
        var balanceMonths=[];
        var runningDate=new Date();
        runningDate.setDate(1);
        balanceMonths.push(runningDate.getTime());
        while(runningDate.getTime()>region.createdAt.getTime()) {
          // console.log("Running month : " + runningDate);
          if(runningDate.getMonth()==0) {
            runningDate.setFullYear(runningDate.getFullYear()-1);  
            runningDate.setMonth(11);  
          } else {
            runningDate.setMonth(runningDate.getMonth()-1);    
          }
          balanceMonths.push(runningDate.getTime());
        }
        deferred.resolve(balanceMonths);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;
    },
    getBalanceSheetRevenues: function(regionName, balanceSheetObject) {
      var Revenue = Parse.Object.extend("Revenue");
      var revenueQuery = new Parse.Query(Revenue);
      revenueQuery.equalTo("residency",regionName);
      revenueQuery.equalTo("balanceSheet", balanceSheetObject)
      return revenueQuery.find();
    },
    getBalanceSheetExpenses: function(regionName, balanceSheetObject) {
      var Expense = Parse.Object.extend("Expense");
      var expenseQuery = new Parse.Query(Expense);
      expenseQuery.equalTo("residency",regionName);
      expenseQuery.equalTo("balanceSheet", balanceSheetObject)
      return expenseQuery.find();
    },
    getMonthlyBalanceSheet: function(regionName, balanceSheetObject) {
      var deferred=$q.all([
        this.getBalanceSheetRevenues(regionName, balanceSheetObject),
        this.getBalanceSheetExpenses(regionName, balanceSheetObject)
      ]);
      return deferred;
    },
    saveRevenue: function(revenueRecord){
      return revenueRecord.save();
    },
    getExpenseCategories: function() {
      return [
        {label: "Water Supply", value : "Water Supply"},                              
        {label: "Electricity", value : "Electricity"},
        {label: "Garbage Collection", value : "Garbage Collection"},        
        {label: "Watchmen", value : "Watchmen"},                
        {label: "Other", value : "Other"}
      ];
    },
    getSelectedExpenseCategory: function(categoryList, category) {
      for(var i=0;i<categoryList.length;i++) {
        if(categoryList[i].value==category) {
          return categoryList[i];
        }
      }
      return categoryList[0];
    },
    openBalanceSheet: function(inputBalanceSheet) {
      balanceSheetCache.remove(inputBalanceSheet.residency);
      var BalanceSheet = Parse.Object.extend("BalanceSheet");
      var balanceSheet=new BalanceSheet();
      balanceSheet.set("startDate", inputBalanceSheet.startDate);
      balanceSheet.set("status", "OPEN");
      balanceSheet.set("residency", inputBalanceSheet.residency);
      balanceSheet.set("openedBy", inputBalanceSheet.openedBy);
      return balanceSheet.save();
    },
    closeBalanceSheet: function(balanceSheetObjectId, inputBalanceSheet) {
      balanceSheetCache.remove(inputBalanceSheet.residency);      
      var BalanceSheet = Parse.Object.extend("BalanceSheet");
      var balanceSheet=new BalanceSheet();
      balanceSheet.set("objectId", balanceSheetObjectId);      
      balanceSheet.set("endDate", inputBalanceSheet.endDate);
      balanceSheet.set("status", "CLOSED");
      balanceSheet.set("closedBy", inputBalanceSheet.closedBy);
      balanceSheet.set("carryForwardBalance", inputBalanceSheet.carryForwardBalance);
      balanceSheet.set("generateHomeOwnerPayments", inputBalanceSheet.generateHomeOwnerPayments);            
      return balanceSheet.save();
    },
    addCarryForwardEntryToBalanceSheet: function(inputBalanceSheet, carryForwardAmount) {
      var revenueInputData={
        residency: inputBalanceSheet.get("residency"),
        createdBy: inputBalanceSheet.get("openedBy"),
        revenueAmount: carryForwardAmount,
        revenueDate: inputBalanceSheet.get("startDate"),
        note: "Carry forwarded amount from previous balance sheet.",
        category: false,
        revenueSource: "Carry forwarded amount",
        balanceSheet: inputBalanceSheet,
        status: "COMPLETED"
      };
      return this.addRevenue(revenueInputData);
    },
    generateHomeOwnerPayments: function(balanceSheet, due) {
      var self=this;
      var deferred = $q.defer();
      AccountService.getListOfHomesInCommunity(balanceSheet.get("residency")).then(function(homesList) {
        if(homesList!=null && homesList.length>0) {
          var revenueObjects=[];
          for(var i=0;i<homesList.length;i++) {
            var revenueInputData={
              residency: balanceSheet.get("residency"),
              createdBy: balanceSheet.get("openedBy"),
              revenueAmount: due,
              revenueDate: balanceSheet.get("startDate"),
              note: "System generated payment ",
              category: true,
              revenueSource: "Home # " + homesList[i].value,
              balanceSheet: balanceSheet,
              status: "PENDING",
              homeNo: homesList[i].value
            };
            console.log("Creating payments for home no " + homesList[i].value);
            revenueObjects.push(self.populateRevenueObjectFromInput(revenueInputData));
          }
          Parse.Object.saveAll(revenueObjects).then(function(revenueObjects) {
            NotificationService.pushNotification(balanceSheet.get("residency"), "Your next maintenance payment is scheduled.");  
            deferred.resolve(revenueObjects);    
          }, function(error) {
            deferred.reject("Unable to generate maintenance dues.");    
          });
          
        } else {
          deferred.resolve([]);    
        }         
      }, function(error) {
        deferred.reject("Unable to get available home number");
      });      
      return deferred.promise;
    },
    getBalanceSheetByObjectId: function(balanceSheetObjectId){
      var BalanceSheet = Parse.Object.extend("BalanceSheet");
      var query = new Parse.Query(BalanceSheet);
      query.equalTo("objectId", balanceSheetObjectId);
      return query.first();
    },
    getOpenBalanceSheetFromAvailableBalanceSheets: function(availableBalanceSheets){
      var openBalanceSheets=[];
      for(var i=0;i<availableBalanceSheets.length;i++) {
        if(availableBalanceSheets[i].get("status")=="OPEN") {
          openBalanceSheets.push(availableBalanceSheets[i]);
        }
      }
      return openBalanceSheets;
    },
    getBalanceSheetFromAvaialableBalanceSheets: function(balanceSheetId, availableBalanceSheets){
      for(var i=0;i<availableBalanceSheets.length;i++) {
        if(availableBalanceSheets[i].id==balanceSheetId) {
          return availableBalanceSheets[i];
        }
      }
      return null;
    },
    createBalanceSheetEntityWithObjectId: function(balanceSheetObjectId){
      var BalanceSheet = Parse.Object.extend("BalanceSheet");
      var balanceSheet=new BalanceSheet();      
      balanceSheet.set("objectId", balanceSheetObjectId);
      return balanceSheet;
    }        
  };
}]);
