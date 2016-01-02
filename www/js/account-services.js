angular.module('account.services', [])

.factory('AccountService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, $q) {
  var NO_DATA_FOUND_KEY="NO_DATA_FOUND";
  var userLastRefreshTimeStamp=null; //new Date().getTime();
  var accessRequestCache;
  if (!CacheFactory.get('accessRequestCache')) {
    accessRequestCache = CacheFactory('accessRequestCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Hour
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
    isSuperAdmin: function(){
      var user=Parse.User.current();
      if(user!=null && user.get("role")=="SUADM"){
        return true;
      }else{
        return false;
      }      
    },
    isCitizen: function(){
      var user=Parse.User.current();
      if(user!=null || user.get("role")=="CTZEN"){
        return true;
      }else{
        return false;
      }
    },
    isLogoutAllowed: function(user){
      if(user!=null && user.get("lastName")=="Pragada"){
        return true;
      }else{
        return false;
      }
    },
    canUpdateRegion: function(){
      var user=Parse.User.current();
      if(user!=null && user.get("role")=="JNLST" || user.get("role")=="SUADM" || user.get("role")=="SOACT"){
        return true;
      }else{
        return false;
      }
    },
    getUser: function() {
      if(new Date().getTime()-userLastRefreshTimeStamp>(1 * 60 * 60 * 1000)) {
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
    },
    addInvitedContact: function(inputUser) {
      var newUser=new Parse.User();
      var userName=COUNTRY_LIST[0].countryCode+""+inputUser.phoneNum;
      newUser.set("username", userName);
      newUser.set("password", "custom");
      newUser.set("firstName", inputUser.firstName.capitalizeFirstLetter());
      newUser.set("lastName", inputUser.lastName.capitalizeFirstLetter());
      newUser.set("residency", Parse.User.current().get("residency"));
      newUser.set("phoneNum", inputUser.phoneNum);
      newUser.set("countryCode", COUNTRY_LIST[0].countryCode);
      newUser.set("role", "CTZEN");
      newUser.set("notifySetting", true);
      newUser.set("deviceReg", "N");
      newUser.set("status", "P");
      return newUser.save();     
    },
    validateInvitationCode: function(invitationCode) {
      var self=this;
      var deferred = $q.defer();
      var userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo("objectId", invitationCode);
      userQuery.first(function(user) {
        if(user!=null) {
          if(user.get("status")=="P" || self.isLogoutAllowed(user)) {
            Parse.User.logIn(user.getUsername(), "custom", {
              success: function(authoritativeUser) {
                deferred.resolve(authoritativeUser);
                authoritativeUser.set("status", "A");
                authoritativeUser.save();
              }, error: function(error) {
                deferred.reject(error);
              }
            });            
          } else {
            deferred.reject(new Parse.Error(5001, "Invitation code has already been used."));  
          }
        } else {
          deferred.reject(new Parse.Error(5001, "Unable to find invitation code."));  
        }
      }, function(error) {
        deferred.reject(error);
      });    
      return deferred.promise;      
    }
  };
}]);
