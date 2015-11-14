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
    getRegionListFromCache: function() {
      var regions=[];      
      if(regionHeirarchy!=null) {
        for(var i=0;i<regionHeirarchy.length;i++) {
          var region=regionCache.get(regionHeirarchy[i]);  
          if(region!=null) {
            regions.push(region);
          }
        }
      }
      return regions;
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

.factory('RegionFinancialService', ['CacheFactory', '$q', function(CacheFactory, $q) {
  var regionFinancials=null;
  return {
    getRegionFinancials: function(regionUniqueNameList) {
      // console.log("List being requested " + JSON.stringify(regionUniqueNameList));
      var deferred = $q.defer();      
      if(regionFinancials!=null) {
        console.log("Returning existing records");
        deferred.resolve(regionFinancials);  
      } else {
        console.log("Retrieving financial records");
        var RegionFinancial = Parse.Object.extend("RegionFinancial");
        var query = new Parse.Query(RegionFinancial);
        query.containedIn("regionUniqueName", regionUniqueNameList);
        query.equalTo("status","A");
        query.descending("year");
        query.find({
          success: function(financials) {
            console.log("Successfully retrieved financial records");            
            regionFinancials=[];            
            for(var i=0;i<financials.length;i++) {
              var financialEntry={key: financials[i].get("year")+"-"+financials[i].get("regionUniqueName"), value: financials[i]};
              regionFinancials.push(financialEntry);
            }
            // console.log("Completed cache development " + JSON.stringify(regionFinancials));
            deferred.resolve(regionFinancials);  
          },
          error: function(error) {
            console.log("Failed to get financial records");            
            deferred.reject(error)
          }
        }); 
      }
      return deferred.promise;
    },
    getRegionFinancialDetails: function(regionUniqueName, year) {
      if(regionFinancials!=null) {
        for(var i=0;i<regionFinancials.length;i++) {
          if(regionFinancials[i].key==year+"-"+regionUniqueName) {
            return regionFinancials[i].value;
          }
        }
      }
      return null;
    }
  };
}])

.factory('ActivityService', ['$http', 'AccountService', 'NotificationService', 'LogService', 'paragraph', function($http, AccountService, NotificationService, LogService, paragraph) {
  return {
    getAllowedActivities: function(role) {
      var allowedActivities=[ACTIVITY_LIST[0], ACTIVITY_LIST[1], ACTIVITY_LIST[2]];
      if(role!=null && role!="CTZEN") {
        allowedActivities.unshift(ACTIVITY_LIST[3]);        
        allowedActivities.unshift(ACTIVITY_LIST[4]);
      }
      return allowedActivities;
    },
    getActivityTypeInAList: function(activityId, activityList) {
      for(var i=0;i<activityList.length;i++) {
        if(activityId==activityList[i].id) {
          return activityList[i];
        }
      }
      return activityList[0];
    },
    getActivityRegionInAList: function(regionUniqueName, regionList) {
      for(var i=0;i<regionList.length;i++) {
        if(regionUniqueName==regionList[i].id) {
          return regionList[i];
        }
      }
      return regionList[0];
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
    reportActivitySpam: function(activity) {
      console.log("Updating status field of activity " + activity.id);
      var spamReportedUsers=activity.get("spamRep");
      if(spamReportedUsers==null) {
        spamReportedUsers=[Parse.User.current().id];
      } else {
        spamReportedUsers.push(Parse.User.current().id);
      }
      activity.set("spamRep", spamReportedUsers);
      activity.set("status", "S");      
      activity.save();      
      AccountService.sendNotificationToAdmin("Activity spam notice : " + activity.get('notifyMessage'));
    },
    removeActivitySpamFlag: function(activity) {
      console.log("Updating status field of activity " + activity.id);
      activity.set("status", "A");      
      activity.save();      
      return activity;
    },    
    reportDebateSpam: function(debate) {
      console.log("Updating status field of debate " + debate.id);
      var spamReportedUsers=debate.get("spamRep");
      if(spamReportedUsers==null) {
        spamReportedUsers=[Parse.User.current().id];
      } else {
        spamReportedUsers.push(Parse.User.current().id);
      }
      debate.set("spamRep", spamReportedUsers);
      debate.set("status", "S");  
      debate.save();      
      AccountService.sendNotificationToAdmin("Comment spam notice : " + debate.get("argument"));
    },
    removeDebateSpamFlag: function(debate) {
      console.log("Updating status field of debate " + debate.id);
      debate.set("status", "A");  
      debate.save();
      return debate;      
    },    
    // TODO :: Move this to utilities.js
    toProperPost: function(post) {
      var count=post.replace(/[^A-Z]/g, "").length;
      var splitArray=post.split(' ');
      if((count/(post.length - splitArray.length-1))*100 > 90){
        splitArray[0]=splitArray[0].toLowerCase();
        var properPost = splitArray[0].charAt(0).toUpperCase() + splitArray[0].substring(1) + ' ';
        for(var i=1; i< splitArray.length ;i++){
          splitArray[i] = splitArray[i].toLowerCase();
          var dotFlag = splitArray[i].indexOf(".");
          if(dotFlag == -1){
            properPost += splitArray[i] + ' ';
          }
          else{
            properPost += splitArray[i]+ ' ';
            if(i != splitArray.length-1){
              i++;
              properPost += splitArray[i].charAt(0).toUpperCase() + splitArray[i].toLowerCase().substring(1) + ' ';
            }
          }
        }
        return properPost;
      }
      return post;
    },
    getBadWordsFromMesage: function(message) {
      return paragraph.isGentle(message);
    },
    flagUserAbusive: function(activity) {
      AccountService.flagUserAbusive(activity.get("user").id);
    }    
  };
}])

.factory('AccountService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, $q) {
  var NO_DATA_FOUND_KEY="NO_DATA_FOUND";
  var userLastRefreshTimeStamp=null; //new Date().getTime();
  var accessRequestCache;
  if (!CacheFactory.get('accessRequestCache')) {
    accessRequestCache = CacheFactory('accessRequestCache', {
      maxAge: 24 * 60 * 60 * 1000, // 1 Day
      deleteOnExpire: 'none'
    });
  }

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
    getUser: function() {
      if(new Date().getTime()-userLastRefreshTimeStamp>(24 * 60 * 60 * 1000)) {
        Parse.User.current().fetch();        
        userLastRefreshTimeStamp=new Date().getTime();
        console.log("Refreshing the user " + userLastRefreshTimeStamp + " " + new Date().getTime());        
      } 
      return Parse.User.current();
    },
    updateAccessRequest: function(accessRequest) {
      accessRequestCache.put("accessRequest", accessRequest);
    },
    getAccessRequest: function() {
      var deferred = $q.defer();
      var cachedObjectInfo=accessRequestCache.info("accessRequest");
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        // console.log("Found hit " + JSON.stringify(regionCache.info()) + " Item info : " + JSON.stringify(cachedObjectInfo));
        deferred.resolve(accessRequestCache.get("accessRequest"));  
      } else {
        console.log("No hit for accessRequest, attempting to retrieve from parse ");
        var AccessRequest = Parse.Object.extend("AccessRequest");
        var query=new Parse.Query(AccessRequest);
        query.equalTo("user", Parse.User.current());
        query.descending("createdAt");
        query.find({
          success: function(results) {
            if(results!=null && results.length>0) {
              accessRequestCache.remove("accessRequest");
              accessRequestCache.put("accessRequest", results[0]);          
              deferred.resolve(results[0]);
            } else {
              accessRequestCache.put("accessRequest", NO_DATA_FOUND_KEY);
              deferred.resolve(NO_DATA_FOUND_KEY);
            }
          }, error: function(error) {
            if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
              console.log("Unable to refresh access request hence passing cached one ");
              deferred.resolve(accessRequestCache.get("accessRequest"));  
            } else {
              deferred.reject(error)
            }
          }
        }); 
      }
      return deferred.promise;
    },
    sendNotificationToAdmin: function(message) {
      var userQuery = new Parse.Query(Parse.User);
      userQuery.containedIn("role", ["SUADM", "JNLST", "SOACT"]);
      userQuery.equalTo("residency", Parse.User.current().get("residency"));
      userQuery.descending("role");
      userQuery.first({
        success: function(authoritativeUser) {
          NotificationService.pushNotificationToUserList([authoritativeUser.id], message);
        }, error: function(err) {
          LogService.log({type:"ERROR", message: "No admin found to report spam " + JSON.stringify(err) + " Message : " + message}); 
        }
      });    
    },
    flagUserAbusive: function(userId) {
      Parse.Cloud.run('modifyUser', { targetUserId: userId, userObjectKey: 'status', userObjectValue: 'S' }, {
        success: function(status) {
          console.log("Successfully blocked the user " + JSON.stringify(status));
        },
        error: function(error) {
          console.log("Unable to block the user : " + JSON.stringify(error));
        }
      });      
    },
    updateRoleAndTitle: function(userId, role, title) {
      Parse.Cloud.run('modifyUser', { targetUserId: userId, userObjectKey: 'role', userObjectValue: role }, {
        success: function(status1) {
          console.log("Successfully updated user role " + JSON.stringify(status1));
          Parse.Cloud.run('modifyUser', { targetUserId: userId, userObjectKey: 'title', userObjectValue: title }, {
            success: function(status2) {
              console.log("Successfully updated user title " + JSON.stringify(status2));
            },
            error: function(error) {
              LogService.log({type:"ERROR", message: "Unable to update user title " + JSON.stringify(error) + " UserId : " + userId}); 
            }
          });      
        },
        error: function(error) {
          LogService.log({type:"ERROR", message: "Unable to update user role " + JSON.stringify(error) + " UserId : " + userId}); 
        }
      });      
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
        success: function(response) {
          console.log("Response from pushNotification : " + JSON.stringify(response));
          LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
        }, 
        error: function(error) {
          console.log("Error from pushNotification : " + JSON.stringify(error));
          LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
        }
      });
    },         
    pushNotificationToUserList: function(userList, message) {
      Parse.Cloud.run('pushNotificationToUserList', {"userList": userList, "message":message}, {
        success: function(response) {
          console.log("Response from pushNotification : " + JSON.stringify(response));
          LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
        }, 
        error: function(error) {
          console.log("Error from pushNotification : " + JSON.stringify(error));
          LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
        }
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
          "timeZone": TIMEZONE_ID,            
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
