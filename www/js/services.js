angular.module('starter.services', [])

.factory('RegionService', ['$http', function($http) {
  return {
    all: function(callback) {
      $http.get("js/region.json").success(callback);
    },
    get: function(regionList, regionUniqueName) {
      for(var i=0;i<regionList.length;i++) {
        if(regionList[i].uniqueName==regionUniqueName) {
          return regionList[i];
        }
      }
      return null;
    }
  };
}])

.factory('LogService', ['$http', function($http) {
  return {
    log: function(logObject) {
      var AuditLog = Parse.Object.extend("AuditLog");
      var auditLog = new AuditLog();
      logObject.userName=Parse.User.current().get("username");
      auditLog.save(logObject, {
        success: function(logObject) {
          console.log("Successfully sent audit log")
        },
        error: function(logObject, error) {
          console.log("Error in sending audit log " + JSON.stringify(error));
        }
      });
    }
  };
}])

.factory('NotificationService', ['$http', function($http) {
  var PARSE_APPLICATION_KEY="kkpgMBxA7F9PgV6tjISEOWFbXvAgha9pXp7FWvWW";
  var PARSE_REST_API_KEY="EAz3Z0La6QiOA5XLQdJX8SRvvmCVfHdzyzJBFx1t";
  return {
    getInstallationByInstallationId: function(installationId, successCallback, errorCallback) {
      var paramsRequest={"where":{"objectId":installationId}};
      var req = {
       method: 'GET',
       url: 'https://api.parse.com/1/installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       params: paramsRequest
      };
      $http(req).then(successCallback, errorCallback);
    },
    getInstallationByUserId: function(userObjectId, successCallback, errorCallback) {
      Parse.Cloud.run('getInstallationByUserId', {"userObjectId": userObjectId}, {
        success: successCallback, 
        error: errorCallback
      });
    },   
    pushNotification: function(residency, message, successCallback, errorCallback) {
      Parse.Cloud.run('pushNotification', {"residency": residency, "message":message}, {
        success: successCallback, 
        error: errorCallback
      });
    },         
    addAndroidInstallation: function(userObjectId, deviceToken, channelArray, successCallback, errorCallback) {
      var req = {
       method: 'POST',
       url: 'https://api.parse.com/1/installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       data: {
          "deviceType": "android",
          "pushType": "gcm",
          "deviceToken": deviceToken,
          "GCMSenderId": "927589908829",
          "channels": channelArray,
          "user": {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userObjectId
          }
        }
      };
      $http(req).then(successCallback, errorCallback);
    }
  };
}])
;
