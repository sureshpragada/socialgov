angular.module('starter.services', [])


.factory('RegionService', ['CacheFactory', '$q', function(CacheFactory, $q) {
  var regionHeirarchy=null;
  var regionCache;
  if (!CacheFactory.get('regionCache')) {
    regionCache = CacheFactory('regionCache', {
      maxAge: 24 * 60 * 60 * 1000, // 1 Day
      deleteOnExpire: 'none'
    });
  }

  return {
    getRegion: function(regionUniqueName) {
      var deferred = $q.defer();
      var cachedObjectInfo=regionCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        // console.log("Found hit " + JSON.stringify(regionCache.info()) + " Item info : " + JSON.stringify(cachedObjectInfo));
        deferred.resolve(regionCache.get(regionUniqueName));  
      } else {
        console.log("No hit, attempting to retrieve from parse " + regionUniqueName + " Info : " + JSON.stringify(cachedObjectInfo));
        var Region = Parse.Object.extend("Region");
        var query = new Parse.Query(Region);
        query.equalTo("uniqueName", regionUniqueName);
        query.find({      
          success: function(regions) {
            regionCache.remove(regionUniqueName);
            regionCache.put(regionUniqueName, regions[0]);          
            deferred.resolve(regions[0]);
          }, 
          error: function(error) {
            if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
              console.log("Unable to refresh region hence passing cached one " + regionUniqueName + " " + JSON.stringify(error));
              deferred.resolve(regionCache.get(regionUniqueName));  
            } else {
              deferred.reject(error)
            }
          }
        }); 
      }
      return deferred.promise;
    },
    getLiteRegionList: function(selectQuery, value) {
      // TODO :: Cache these for short interval and flush aggressively
      var Region = Parse.Object.extend("Region");
      var query = new Parse.Query(Region);
      query.select("name", "uniqueName", "parentRegion")
      query.ascending("name");
      if(selectQuery=="parent") {
        query.equalTo("parentRegion", value);  
      } else if(selectQuery=="regionType") {
        query.containedIn("type", value);        
      } else {
        query.equalTo("uniqueName", value);        
      }
      return query.find();       
    },
    initializeRegionCache: function(region) {
      regionHeirarchy=[region.get("uniqueName")];
      for(var i=0;i<region.get("parentRegion").length;i++) {
        regionHeirarchy.push(region.get("parentRegion")[i]);
      }
      console.log("Final region list for cache : " + JSON.stringify(regionHeirarchy));
      var Region = Parse.Object.extend("Region");
      var query = new Parse.Query(Region);
      // TODO :: Evaluate whether it helps to load if it missing in cache      
      query.containedIn("uniqueName", regionHeirarchy);  
      query.find({
        success: function(data) {
          for(var i=0;i<data.length;i++) {
            regionCache.put(data[i].get("uniqueName"), data[i]);
          }
        },
        error: function(error) {
          console.log("Error while initializing the regionCache " + JSON.stringify(error));
        }
      });
    },
    initializeRegionCacheByCurrentUser: function() {
      var self=this;
      if(Parse.User.current()!=null && Parse.User.current().get("residency")!=null) {
        if(regionCache.get(Parse.User.current().get("residency"))!=null) {
          self.initializeRegionCache(regionCache.get(Parse.User.current().get("residency")));
        } else {
          self.getRegion(Parse.User.current().get("residency")).then(function(region) {
            self.initializeRegionCache(region);
          }, function(error) {
            console.log("Unable to refresh region cache by user " + JSON.stringify(error));
          });
        }
      }
    },    
    getAllowedRegions: function(residency) {
      var residencyRegion=regionCache.get(residency);
      if(residencyRegion==null) {
        console.log("Residence region is missing in cache " + JSON.stringify(residency));
        return [{id:residency, label:residency[0].toUpperCase()+residency.substring(1)}];
      } else {
        var regionHeirarchyList=residencyRegion.get("parentRegion");
        var allowedRegionList=[{id: residencyRegion.get("uniqueName"), label: residencyRegion.get("name")}];
        for(var i=0;i<regionHeirarchyList.length;i++) {
          var region=regionCache.get(regionHeirarchyList[i]);
          if(region!=null) {
            allowedRegionList.push({id: region.get("uniqueName"), label:region.get("name")});
          }
        }
        return allowedRegionList;        
      }
    },
    getRegionHierarchy: function() {
      if(regionHeirarchy==null) {
        this.getRegion(Parse.User.current().get('residency')).then(function(data) {
          regionHeirarchy=[data.get("uniqueName")];
          var parentRegionArray=data.get("parentRegion");
          for(var i=0;i<parentRegionArray.length;i++) {
            regionHeirarchy.push(parentRegionArray[i]);
          }
        }, function(error) {
          console.log("Unable to form region hierarchy");
        });
        return [Parse.User.current().get("residency")];  
      } else {
        return regionHeirarchy;
      }
    },
    updateRegion: function(regionName, region) {
      regionCache.remove(regionName);
      regionCache.put(regionName, region);                
    }
  };
}])

.factory('ActivityService', ['$http', 'AccountService', function($http, AccountService) {
  return {
    getAllowedActivities: function(role) {
      var allowedActivities=[
        {id:"ISSU", label:"Report Problem"},      
        {id:"IDEA", label:"Development Idea"}
      ];
      if(role!=null && role!="CTZEN") {
        allowedActivities.unshift({id:"EVNT", label:"Public Program"});        
        allowedActivities.unshift({id:"NOTF", label:"Notification"});
      }
      return allowedActivities;
    },
    getActivityInAList: function(activityId, activityList) {
      for(var i=0;i<activityList.length;i++) {
        if(activityId==activityList[i].id) {
          return activityList[i];
        }
      }
      return activityList[0];
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
    },
    removePost: function(activityId) {
      console.log("Updating status field of activity");
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      activity.set("id", activityId);
      activity.set("status", "D");
      return activity.save();
    },
    reportSpam: function(activityId) {
      console.log("Updating status field of activity");
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      activity.set("id", activityId);
      activity.increment("spam", 1);
      // TODO :: Send a push notification to the super admin or remove post if spamCount exceeds some threshold
      return activity.save();
    }    
  };
}])

.factory('AccountService', ['CacheFactory', 'RegionService', function(CacheFactory, RegionService) {

  var userLastRefreshTimeStamp=null; new Date().getTime();

  return {
    getRolesAllowedToChange: function() {
      return [USER_ROLES[0], USER_ROLES[1], USER_ROLES[2], USER_ROLES[3]];      
    },    
    getRegionsAllowedToPost: function(role, residency) {
      if(role=="CTZEN") {
        return [RegionService.getAllowedRegions(residency)[0]];
      } else {
        return RegionService.getAllowedRegions(residency);
      }
    },
    getRoleNameFromRoleCode: function(roleCode) {
      for(var i=0;i<USER_ROLES.length;i++) {
        if(USER_ROLES[i].id==roleCode) {
          return USER_ROLES[i].label;
        }
      }
      return "Citizen";
    },
    isSuperAdmin: function(roleCode){
      if(roleCode=="SUADM"){
        return true;
      }else{
        return false;
      }
    },
    isCitizen: function(roleCode){
      if(roleCode==null || roleCode=="CTZEN"){
        return true;
      }else{
        return false;
      }
    },
    canUpdateRegion: function(){
      var user=Parse.User.current();
      // console.log("User role : " + user.get("role"));
      if(user.get("role")=="JNLST" || user.get("role")=="SUADM" || user.get("role")=="SOACT"){
        return true;
      }else{
        return false;
      }
    },
    refreshUser: function() {
      if(new Date().getTime()-userLastRefreshTimeStamp>(24* 60 * 60*1000)) {
        userLastRefreshTimeStamp=new Date().getTime();
        Parse.User.current().fetch();
      }
    }
  };
}])


.factory('LogService', ['$http', function($http) {
  return {
    log: function(logObject) {
      console.log(JSON.stringify(logObject));
      var AuditLog = Parse.Object.extend("AuditLog");
      var auditLog = new AuditLog();
      logObject.username=Parse.User.current().get("username");
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

.factory('NotificationService', ['$http', 'LogService', function($http, LogService) {
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
    addAndroidInstallation: function(userObjectId, deviceToken, channelArray) {
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
          "GCMSenderId": GCM_SENDER_ID,
          "channels": channelArray,
          "timeZone": "Asia/Kolkata",
          "user": {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userObjectId
          }
        }
      };
      var self=this;
      $http(req).then( function(result){ 
          self.updateUserDeviceRegStatus();
          LogService.log({type:"INFO", message: "Registered android device " + JSON.stringify(result.data)}); 
        }, function(error) {
          LogService.log({type:"ERROR", message: "Failed to register android device " + JSON.stringify(error)});                        
      });
    },
    addIOSInstallation: function(userObjectId, deviceToken, channelArray) {
      var req = {
       method: 'POST',
       url: 'https://api.parse.com/1/installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       data: {
          "deviceType": "ios",
          "deviceToken": deviceToken,
          "channels": channelArray,
          "appIdentifier": IOS_APP_IDENTIFIER,
          "timeZone": "Asia/Kolkata",            
          "user": {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userObjectId
          }
        }
      };
      var self=this;
      $http(req).then(function(result){ 
          self.updateUserDeviceRegStatus();
          LogService.log({type:"INFO", message: "Registered IOS device " + JSON.stringify(result.data)}); 
        }, function(error) {
          LogService.log({type:"ERROR", message: "Failed to register IOS device " + JSON.stringify(error)});                        
      });
    },    
    updateUserDeviceRegStatus: function() {
      var user=Parse.User.current();
      user.set("deviceReg", "Y");
      user.save();
    }
  };
}])
;
