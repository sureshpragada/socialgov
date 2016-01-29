angular.module('financial.services', [])

.factory('FinancialService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, $q) {

// Mar 2016 4000.00
// Sep 2015 3000.00
// Jan 2015 2000.00
// Jan 2014 1000.00
// Current date : Jan 23 2016
// Mar 2016 > Jan 23 2016 - Upcoming
// Jan 23 2016 > Sep 2015 & first records - Current
// Jan 23 2016 > [Date] - History

  return {
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
      expense.set("paidTo",input.paidTo);
      expense.set("expenseAmount",input.expenseAmount);
      expense.set("expenseDate",input.expenseDate);
      expense.set("reason",input.reason);
      console.log(JSON.stringify(expense));
      return expense.save();
    },
    addRevenue: function(input) {
      var Revenue = Parse.Object.extend("Revenue");
      var revenue = new Revenue();
      revenue.set("residency",Parse.User.current().get("residency"));
      revenue.set("createdBy",Parse.User.current());
      revenue.set("revenueSource",input.revenueSource);
      revenue.set("revenueAmount",input.revenueAmount);
      revenue.set("revenueDate",input.revenueDate);
      revenue.set("note",input.note);
      console.log(JSON.stringify(revenue));
      return revenue.save();
    },
    getMyPaymentHistory: function(regionName, homeNo) {
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("residency",regionName);
      query.equalTo("revenueSource", homeNo);
      return query.find();
    },
    getCurrentMonthExpenseList: function(regionName){
      var Expense = Parse.Object.extend("Expense");
      var query = new Parse.Query(Expense);
      query.equalTo("residency",regionName);
      return query.find();
    },
    getCurrentMonthRevenueList: function(regionName){
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("residency",regionName);
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
    getMonthlyBalanceSheet: function(regionName, date) {
      var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      var Revenue = Parse.Object.extend("Revenue");
      var revenueQuery = new Parse.Query(Revenue);
      revenueQuery.equalTo("residency",regionName);
      revenueQuery.greaterThan("revenueDate", firstDay);
      revenueQuery.lessThan("revenueDate", lastDay);

      var Expense = Parse.Object.extend("Expense");
      var expenseQuery = new Parse.Query(Expense);
      expenseQuery.equalTo("residency",regionName);
      expenseQuery.greaterThan("expenseDate", firstDay);
      expenseQuery.lessThan("expenseDate", lastDay);      

      var deferred=$q.all([
        revenueQuery.find(),
        expenseQuery.find()
      ]);
      return deferred;
    }    
  };
}]);
