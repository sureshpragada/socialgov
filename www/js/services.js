angular.module('starter.services', [])

.factory('RegionService', ['$http', function($http) {
  return {
    all: function(callback) {
      $http.get(REGION_JSON_URL).success(callback);
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

.factory('ActivityService', ['$http', function($http) {
  return {
    getAllowedActivities: function(role) {
      var allowedActivities=[
        {id:"IDEA", label:"Development Idea"}
      ];
      if(role!=null && role!="CTZEN") {
        allowedActivities.push({id:"NOTF", label:"Notification"});
      }
      return allowedActivities;
    },
    getAllowedRegions: function(residency) {
      var allowedRegions=[
        {id:residency, label:residency[0].toUpperCase()+residency.substring(1)}
      ];
      // Use Region service to look up parent executive regions 
      return allowedRegions;      
    },
    getMockData: function() {

      var User = Parse.Object.extend("User");
      var user = new User();
      user.set("firstName", "Suresh");
      user.set("lastName", "Pragada");
      user.set("title", "Civil Society");

      var Activity = Parse.Object.extend("Activity");

      var activity1 = new Activity();
      activity1.set("user", user);
      activity1.set("notifyMessage", "MLC Balisali Indira garu will be facilitating the techers on occasion of Teachers Day. This even will happen in Lutheran high school play ground at 6 PM on Monday.");
      activity1.set("createdAt", new Date());
      activity1.set("activityType", "NOTF");

      var activity2 = new Activity();
      activity2.set("user", user);
      activity2.set("notifyMessage", "MLC Balisali Indira garu will be facilitating the techers on occasion of Teachers Day. This even will happen in Lutheran high school play ground at 6 PM on Monday.");
      activity2.set("createdAt", new Date());
      activity2.set("activityType", "PBLM");

      return [activity1, activity2];
    },
    getActionCode: function(action) {
      if("support"==action) {
        return "S";
      } else if ("oppose"==action) {
        return "O";
      } else {
        return "N";
      }
    },
    getAction: function(actionCode) {
      if("S"==actionCode) {
        return "support";
      } else if ("O"==actionCode) {
        return "oppose";
      } else {
        return "neutral";
      }
    }
  };
}])

.factory('LogService', ['$http', function($http) {
  return {
    log: function(logObject) {
      var AuditLog = Parse.Object.extend("AuditLog");
      var auditLog = new AuditLog();
      logObject.username=Parse.User.current().get("username");
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
