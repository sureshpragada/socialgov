angular.module('settings.services', [])

.factory('SettingsService', ['$http', 'CacheFactory', function($http, CacheFactory) {
  var appMessage=null;
  var expense=null;
  var settingsCache;
  if (!CacheFactory.get('settingsCache')) {
    settingsCache = CacheFactory('settingsCache', {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 Day
      deleteOnExpire: 'none', 
      storageMode: 'localStorage'
    });
  }

  return {
    getPreference: function(key) {
      var cachedValue=settingsCache.get(key);
      // console.log("Getting cache " + key + " " + cachedValue);
      return cachedValue;
    },
    setPreference: function(key, value) {
      // console.log("Setting cache " + key + " " + value);
      settingsCache.put(key, value);
    },    
    setAppMessage: function(notifyMessage, messageType) {
      this.appMessage={
        message: notifyMessage, 
        type: messageType
      };
    },
    setAppSuccessMessage: function(notifyMessage) {
      this.setAppMessage(notifyMessage, "SUCCESS");
    },    
    setAppInfoMessage: function(notifyMessage) {
      this.setAppMessage(notifyMessage, "INFO");
    },    
    setAppErrorMessage: function(notifyMessage) {
      this.setAppMessage(notifyMessage, "ERROR");
    },
    getAppMessage: function() {
      var tempAppMessage=this.appMessage;
      this.appMessage=null;
      return tempAppMessage;
    },
    getControllerErrorMessage: function(errorMessage) {
      return {
        message: errorMessage, 
        type: "ERROR"
      };
    },
    getControllerSuccessMessage: function(successMessage) {
      return {
        message: successMessage, 
        type: "SUCCESS"
      };
    },    
    getControllerInfoMessage: function(infoMessage) {
      return {
        message: infoMessage, 
        type: "INFO"
      };
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
    getCurrentMonthExpenseList: function(region){
      var Expense = Parse.Object.extend("Expense");
      var query = new Parse.Query(Expense);
      query.equalTo("residency",region);
      return query.find();
    },
    getCurrentMonthRevenueList: function(region){
      var Revenue = Parse.Object.extend("Revenue");
      var query = new Parse.Query(Revenue);
      query.equalTo("residency",region);
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
    }
  };
}]);
