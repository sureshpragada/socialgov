angular.module('log.services', ['ionic'])

.factory('LogService', ['$http', 'SettingsService', function($http, SettingsService) {
  return {
    log: function(logObject) {
      console.log(JSON.stringify(logObject));
      var AuditLog = Parse.Object.extend("AuditLog");
      var auditLog = new AuditLog();
      if(Parse.User.current()!=null) {
        logObject.username=Parse.User.current().get("username");
      } else {
        logObject.username="unauthenticated";
      }
      
      SettingsService.trackException(JSON.stringify(logObject));

      auditLog.save(logObject, {
        success: function(logObject) {
          console.log("Successfully sent audit log")
        },
        error: function(logObject, error) {
          console.log("Error sending audit log " + JSON.stringify(error));
        }
      });
    }
  };
}])
;
