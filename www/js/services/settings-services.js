angular.module('settings.services', [])

.factory('SettingsService', ['$http', 'CacheFactory', function($http, CacheFactory) {
  var pageTransitionData=null;
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
    setPageTransitionData: function(pageTransitionData) {
      this.pageTransitionData=pageTransitionData;
    },
    getPageTransitionData: function() {
      var tempPageTransitionData=this.pageTransitionData;
      this.pageTransitionData=null;
      return tempPageTransitionData;
    },
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
    setAppIdeaMessage: function(notifyMessage) {
      this.setAppMessage(notifyMessage, "IDEA");
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
    getControllerIdeaMessage: function(successMessage) {
      return {
        message: successMessage, 
        type: "IDEA"
      };
    },        
    getControllerInfoMessage: function(infoMessage) {
      return {
        message: infoMessage, 
        type: "INFO"
      };
    },
    getLoadingMessage: function(message) {
      return {
        template: "<p class='item-icon-left'>"+message+"...<ion-spinner/></p>",
        duration: LOADING_DURATION
      };
    },
    trackView: function(view) {
      console.log(view);
      if(window.analytics!=null && ENV=="PROD") { 
        window.analytics.trackView(view); 
      }
    }
  };
}]);
