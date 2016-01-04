angular.module('settings.services', [])

.factory('SettingsService', ['$http', 'CacheFactory', function($http, CacheFactory) {
  var appMessage=null;
  var orderSubmitted=false;

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
    setOrderSubmittedStatus: function(status) {
      this.orderSubmitted=status;
    },
    getOrderSubmittedStatus: function() {
      return this.orderSubmitted;
    }
  };
}]);
