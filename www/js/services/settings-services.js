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
    initializeGoogleAnalytics: function() {
      if(this.canUseAnalytics()) { 
        window.analytics.startTrackerWithId(ANALYTICS_TRACKING_ID);
        // if(AccountService.getUser()!=null) {
        //   window.analytics.setUserId(AccountService.getUser().get("username"));
        // }      
      }
    },
    trackView: function(view) {
      console.log("View : " + view);
      if(this.canUseAnalytics()) { 
        window.analytics.trackView(view); 
      }
    },
    trackEvent: function(category, action) {
      console.log("Event : " + category + " " + action);
      if(this.canUseAnalytics()) { 
        window.analytics.trackEvent(category, action); 
      }
    },
    trackException: function(message) {
      console.log("Message : " + message);
      if(this.canUseAnalytics()) { 
        window.analytics.trackException(message, false);
      }      
    },
    canUseAnalytics: function() {
      if(window.analytics!=null && ENV=="PROD") { 
        var user=Parse.User.current();
        if(user!=null && user.get("deviceReg")=='Y') {
          return true;
        } 
      } 
      return false; 
    }
  };
}]);
