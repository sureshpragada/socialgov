angular.module('log.services', ['ionic'])

.factory('LogService', ['$http', 'SettingsService', '$q', function($http, SettingsService, $q) {
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
    },
    getAuditLog: function() {
        var deferred = $q.defer();      
        var AuditLog = Parse.Object.extend("AuditLog");
        var query = new Parse.Query(AuditLog);
        query.equalTo("type","INFO");
        query.ascending("createdAt");
        query.limit(1000);
        query.find(function(logEntries) {
            console.log("Queried audit log");
            if(logEntries!=null && logEntries.length==1000) {
              // Make another attempt to get it
              query.skip(1000);
              query.find(function(logEntries2) {
                deferred.resolve(logEntries.concat(logEntries2));
              }, function(error) {
                deferred.reject(error);
              });
            } else {
              deferred.resolve(logEntries);
            }
          }, function(error) {
            deferred.reject(error);
          });       
        return deferred.promise;
    }
  };
}])
;
