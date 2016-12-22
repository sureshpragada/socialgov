angular.module('account.services', [])

.factory('AccountService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', 'UtilityService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, UtilityService, $q) {
  var NO_DATA_FOUND_KEY="NO_DATA_FOUND";
  var userLastRefreshTimeStamp=null; //new Date().getTime();
  var communityAddress={
    country: COUNTRY_LIST[0]
  };
  var communityInfo={
    multiBlock: false
  };
  var yourInfo={
    homeOwner: true
  };

  var accessRequestCache;  
  if (!CacheFactory.get('accessRequestCache')) {
    accessRequestCache = CacheFactory('accessRequestCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Hour
      deleteOnExpire: 'none'
    });
  }

  var userResidencyCache;  
  if (!CacheFactory.get('userResidencyCache')) {
    userResidencyCache = CacheFactory('userResidencyCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Hour
      deleteOnExpire: 'none'
    });
  }

  var residentCache;
  if (!CacheFactory.get('residentCache')) {
    residentCache = CacheFactory('residentCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Hour
      deleteOnExpire: 'none'
      //,storageMode: 'localStorage'
    });
  }

  var homesCache;
  if (!CacheFactory.get('homesCache')) {
    homesCache = CacheFactory('homesCache', {
      maxAge: 1 * 60 * 60 * 1000, // 5 mins
      deleteOnExpire: 'none'
    });
  }  

  return { 
    getResidentsInCommunity: function(regionUniqueName) {
      console.log("Requesting residents for " + regionUniqueName);
      var deferred = $q.defer();
      var cachedObjectInfo=residentCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(residentCache.get(regionUniqueName));  
        console.log("Returning from cache");
      } else {
        console.log("Querying for residents " + regionUniqueName);
        var UserResidency = Parse.Object.extend("UserResidency");
        var userQuery = new Parse.Query(UserResidency);
        userQuery.equalTo("residency", regionUniqueName);
        userQuery.ascending("homeNo");        
        userQuery.include("user");    
        userQuery.limit(1000);
        userQuery.find(function(userResidencyList) {
          if(userResidencyList!=null && userResidencyList.length==1000) {
            userQuery.skip(1000);
            userQuery.find(function(userResidencyList1) {
              console.log("Found user residencies 2 " + userResidencyList1!=null?userResidencyList1.length:-1);
              var finalUserResidencies=userResidencyList.concat(userResidencyList1);
              residentCache.remove(regionUniqueName);
              residentCache.put(regionUniqueName, finalUserResidencies);          
              deferred.resolve(finalUserResidencies);              
            }, function(error) {
              if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
                console.log("Returning cached residents");
                deferred.resolve(residentCache.get(regionUniqueName));  
              } else {
                deferred.reject(error);
              }
            });
          } else {
            console.log("Found user residencies " + userResidencyList!=null?userResidencyList.length:-1);
            residentCache.remove(regionUniqueName);
            residentCache.put(regionUniqueName, userResidencyList);          
            deferred.resolve(userResidencyList);
          }
        }, function(error) {
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Returning cached residents");
            deferred.resolve(residentCache.get(regionUniqueName));  
          } else {
            deferred.reject(error);
          }
        }); 
      }
      return deferred.promise;
    },            
    refreshResidentCache: function() {
      console.log("residents removed from cache");
      residentCache.removeAll();
    },
    getUserObjectByPhoneNumber: function(number){
      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.equalTo("phoneNum",number);
      return query.first();
    },    
    getUserResidencies: function(user) {
      console.log("Querying for user residencies" + user.get("username"));
      var UserResidency = Parse.Object.extend("UserResidency");
      var userQuery = new Parse.Query(UserResidency);
      userQuery.equalTo("user", user);
      return userQuery.find();
    },
    getUserResidenciesOfSpecificResidency: function(user, residency) {
      console.log("getUserResidenciesOfSpecificResidency " + user.id + " " + residency);
      var deferred = $q.defer();
      this.getUserResidencies(user).then(function(userResidencyList){
        var userResidency=null;
        for(var i=0;i<userResidencyList.length;i++) {
          if(userResidencyList[i].get("residency")==residency) {
            userResidency=userResidencyList[i];
            break;
          }
        }
        deferred.resolve(userResidency);
      }, function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    },    
    getCurrentUserResidencies: function() {
      console.log("Requesting user residencies");
      var deferred = $q.defer();
      var cachedObjectInfo=userResidencyCache.info("userResidencyCache");
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(userResidencyCache.get("userResidencyCache"));  
        console.log("Returning userresidency from cache");
      } else {        
        this.getUserResidencies(Parse.User.current()).then(function(userResidencyList) {
          userResidencyCache.remove("userResidencyCache");
          userResidencyCache.put("userResidencyCache", userResidencyList);          
          deferred.resolve(userResidencyList);
        }, function(error) {
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Returning cached residents");
            deferred.resolve(userResidencyCache.get("userResidencyCache"));  
          } else {
            deferred.reject(error);
          }
        }); 
      }
      return deferred.promise;
    },      
    isFunctionalAdmin: function(regionSettings, functionName) {
      var user=this.getUser();
      if(user!=null && user.get("status")!="S"){
        if(user.get("role")=="SUADM" || user.get("superAdmin")==true) {
          return true;
        } else if(user.get("role")=="LEGI") {
          var whoControlsFunction=RegionService.getFunctionControllersFromRegionSettings(regionSettings, functionName); 
          for(var i=0;i<whoControlsFunction.length;i++) {
            if(whoControlsFunction[i]==user.get("title")) {
              return true;
            }
          }
        } 
      }
      return false;
    },
    getUserResidency: function() {
      return this.getUser().get("residency");
    },
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
    getCountryFromCountryList: function(countryCode, countryList) {
      for(var i=0;i<countryList.length;i++) {
        if(countryCode==countryList[i].countryCode) {
          return countryList[i];
        }
      }
      return countryList[0];
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
      var user=this.getUser();
      if(user!=null && user.get("role")=="SUADM" || user.get("superAdmin")==true){
        return true;
      }else{
        return false;
      }      
    },
    isCitizen: function(){
      var user=this.getUser();
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
    isHomeOwner: function(){
      var user=this.getUser();
      if(user!=null && user.get("homeOwner")==true){
        return true;
      }else{
        return false;
      }
    },
    canOtherUserUpdateRegion: function(user){
      if(user!=null && user.get("role")=="JNLST" || user.get("role")=="SUADM" || user.get("role")=="SOACT" || user.get("superAdmin")==true){
        return true;
      }else{
        return false;
      }
    },    
    canUpdateRegion: function(){
      var user=Parse.User.current();
      if(user==null) {
        return false;
      } else if(user.get("status")=="S") {
        return false;
      } else if(user.get("role")=="JNLST" || user.get("role")=="SUADM" || user.get("role")=="SOACT" || user.get("role")=="LEGI") {
        return true;
      } else if(user.get("superAdmin")==true) {
        return true;
      } else {
        return false;
      }
    },
    getUser: function() {
      var self=this;      
      if(new Date().getTime()-userLastRefreshTimeStamp>(5 * 60 * 1000)) {
        Parse.User.current().fetch().then(function(newUser) {
          self.getCurrentUserResidencies().then(function(userResidencyList) {
            var foundResidency=false;
            for(var i=0;i<userResidencyList.length;i++) {
              if(newUser.get("residency")==userResidencyList[i].get("residency")) {
                newUser.set("role", userResidencyList[i].get("role"));
                newUser.set("title", userResidencyList[i].get("title"));
                newUser.set("homeOwner", userResidencyList[i].get("homeOwner"));                
                newUser.set("homeNo", userResidencyList[i].get("homeNo"));                
                newUser.save();                   
                foundResidency=true;
                break;
              }
            }
            if(foundResidency==false) {
              LogService.log({type:"ERROR", message: "User residency not found; Must have been vacated?"}); 
              // TODO :: Update user status to "V"; Main controlers should look for this status and redirect 
              // the user to switch residency where it will show info message if he is not invited in any other residencies;
            }
          }, function(error) {});
        }, function(error) {});                 
        userLastRefreshTimeStamp=new Date().getTime();
        console.log("Refreshing the user " + userLastRefreshTimeStamp + " " + new Date().getTime());        
      } 
      return Parse.User.current();
    },
    refreshUser: function() {
      userLastRefreshTimeStamp=null;
      this.getUser();
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
          if(authoritativeUser!=null){
            NotificationService.pushNotificationToUserList([authoritativeUser.id], message);
          }
        }, error: function(err) {
          LogService.log({type:"ERROR", message: "No admin found to report spam " + JSON.stringify(err) + " Message : " + message}); 
        }
      });    
    },
    sendNotificationToBoard: function(message) {
      var userQuery = new Parse.Query(Parse.User);
      userQuery.containedIn("role", ["SUADM", "JNLST", "SOACT", "LEGI"]);
      userQuery.equalTo("residency", Parse.User.current().get("residency"));
      // userQuery.descending("role");
      userQuery.find({
        success: function(authoritativeUsers) {
          if(authoritativeUsers!=null & authoritativeUsers.length>0){
            var userList=[];
            for(var i=0;i<authoritativeUsers.length;i++){
              userList.push(authoritativeUsers[i].id);              
            }
            // console.log("User list to notify : " + JSON.stringify(userList));
            NotificationService.pushNotificationToUserList(userList, message);    
          } else {
            LogService.log({type:"ERROR", message: "No admin found to report spam"}); 
          }          
        }, error: function(err) {
          LogService.log({type:"ERROR", message: "Error while finding admins " + JSON.stringify(err) + " Message : " + message}); 
        }
      });    
    },
    sendNotificationToSpecificMembers: function(message, notifyHomeOwners, blockToNotify) {
      var userQuery = new Parse.Query(Parse.User);
      if(notifyHomeOwners) {
        userQuery.equalTo("homeOwner", true);
      }
      userQuery.equalTo("residency", Parse.User.current().get("residency"));
      // userQuery.descending("role");
      userQuery.find({
        success: function(members) {
          if(members!=null & members.length>0){
            var membersList=[];
            var blockNo = Parse.User.current().get("homeNo").substring(6, Parse.User.current().get("homeNo").indexOf(";"));
            for(var i=0;i<members.length;i++){
              if(blockToNotify!=null && blockToNotify!="ALL"){
                var blockNoFromHomeNum=members[i].get("homeNo").substring(6, members[i].get("homeNo").indexOf(";"));
                if(blockNoFromHomeNum!=blockToNotify){
                  continue;
                }
              }
              membersList.push(members[i].id);              
            }
            console.log("Members list to notify : " + JSON.stringify(membersList));
            NotificationService.pushNotificationToUserList(membersList, message);    
          } else {
            LogService.log({type:"ERROR", message: "No home owners found to report spam"}); 
          }          
        }, error: function(err) {
          LogService.log({type:"ERROR", message: "Error while finding home owners " + JSON.stringify(err) + " Message : " + message}); 
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
      var deferred = $q.defer();      
      /*
          Update user residency record
          getUser, if appointed user is current user
          refresh the cache
      */
      var self=this;      
      this.getUserById(this.getUserResidency(), userId).then(function(userResidency) {
        userResidency.set("role", role);
        userResidency.set("title", title);
        userResidency.save().then(function(updatedUserResidency){
          self.refreshResidentCache();                    
          if(self.getUser().id==userId) {
            self.refreshUser();
          }
          deferred.resolve(updatedUserResidency);
        }, function(error) {
          LogService.log({type:"ERROR", message: "Unable to save user to update title " + JSON.stringify(error) + " UserId : " + userId}); 
          deferred.reject(error);
        });
      }, function(error) {
        LogService.log({type:"ERROR", message: "Unable to get user to update title " + JSON.stringify(error) + " UserId : " + userId}); 
        deferred.reject(error);
      });

      return deferred.promise;
    },
    addContact: function(inputUser) {
      this.refreshResidentCache();
      var newUser=new Parse.User();
      var userName=inputUser.countryCode+""+inputUser.phoneNum;
      newUser.set("username", userName);
      newUser.set("password", "custom");
      newUser.set("firstName", inputUser.firstName.capitalizeFirstLetter());
      newUser.set("lastName", inputUser.lastName.capitalizeFirstLetter());
      newUser.set("phoneNum", inputUser.phoneNum);
      newUser.set("countryCode", inputUser.countryCode);
      newUser.set("role", "CTZEN");
      newUser.set("notifySetting", true);
      newUser.set("deviceReg", "N");
      newUser.set("homeOwner", inputUser.homeOwner==true?true:false);
      newUser.set("homeNo", inputUser.homeNumber);
      newUser.set("tourGuide", "PEND");      
      return newUser;
    },
    addLookUpContact: function(lookUpUser) {
      var newUser = this.addContact(lookUpUser);
      newUser.set("residency", lookUpUser.residency);
      newUser.set("status", "T");
      newUser.set("sentInviteMessageCount",0);
      return newUser.save();        
    },
    addInvitedContact: function(inputUser) {
      var newUser = this.addContact(inputUser);
      newUser.set("residency", Parse.User.current().get("residency"));
      newUser.set("status", "P");
      return newUser.save();        
    },
    updateAccount: function(inputUser) {
      this.refreshResidentCache();
      var user=Parse.User.current();
      user.set("firstName", inputUser.firstName);
      user.set("lastName", inputUser.lastName);
      // user.set("homeNo", inputUser.homeNumber);
      user.set("bloodGroup", inputUser.bloodGroup!=null?inputUser.bloodGroup.toUpperCase():"");
      return user.save();
    },
    updateNeighborAccount: function(inputUser, neighbor, userResidency) {
      this.refreshResidentCache();    
      console.log("input user " + JSON.stringify(inputUser));
      console.log("neighbor " + JSON.stringify(neighbor));

      var promises=[];
      if(inputUser.firstName!=neighbor.get("firstName")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'firstName', userObjectValue: inputUser.firstName }));              
        console.log("Updating firstname");
      }
      if(inputUser.lastName!=neighbor.get("lastName")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'lastName', userObjectValue: inputUser.lastName }));              
        console.log("Updating lastName");
      }      
      if(inputUser.country.countryCode!=neighbor.get("countryCode")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'countryCode', userObjectValue: inputUser.country.countryCode }));
        console.log("Updating countryCode");
      }      
      if(inputUser.phoneNum!=neighbor.get("phoneNum")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'phoneNum', userObjectValue: inputUser.phoneNum }));
        console.log("Updating phoneNum");
      }
      if(inputUser.country.countryCode!=neighbor.get("countryCode") || inputUser.phoneNum!=neighbor.get("phoneNum")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'username', userObjectValue: inputUser.country.countryCode+""+inputUser.phoneNum }));        
        console.log("Updating username");
      }                  

      userResidency.set("homeNo", inputUser.home.value);
      userResidency.set("homeOwner", inputUser.homeOwner);
      promises.push(userResidency.save());

      var deferred=$q.all(promises);
      return deferred;
    },
    recoverInvitationCode: function(inputUserForm) {
      // TODO :: Do lavenstine string match to find the distance of first name and last name
      var deferred = $q.defer();            
      var query = new Parse.Query(Parse.User);
      query.equalTo("phoneNum",inputUserForm.phoneNum);
      query.first().then(function(recoveredUser){
        var newPin=UtilityService.generateRandomNumber(PIN_LENGTH);
        recoveredUser.set("pin", newPin);
        var promises=[];
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: recoveredUser.id, userObjectKey: 'pin', userObjectValue: recoveredUser.get("pin") }));              
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: recoveredUser.id, userObjectKey: 'changePin', userObjectValue: 'Y' }));              
        $q.all(promises).then(function(operationReturnStatusList){
          deferred.resolve(recoveredUser);
        }, function(error){
          deferred.reject(error);
        })
      }, function(error){
        deferred.reject(error);
      });  
      return deferred.promise;
    },
    getUserByUserName: function(username) {
      var query = new Parse.Query(Parse.User);
      query.equalTo("username",username);
      return query.find();
    },    
    resetPin: function(inputUserForm) {
      console.log("PIN reset info : " + JSON.stringify(inputUserForm));
      var user=this.getUser();
      user.set("pin", inputUserForm.newPin);
      user.set("changePin", "N");
      return user.save();
    },
    getResidentsOfHome: function(regionName, homeNo) {
      var deferred = $q.defer();      
      this.getResidentsInCommunity(regionName).then(function(neighborList) {
        var residentList=[];
        for(var i=0;i<neighborList.length;i++) {
          if(neighborList[i].get("homeNo")==homeNo) {
            residentList.push(neighborList[i]);
          }
        }
        deferred.resolve(residentList);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;  
    },
    getUserById: function(regionName, userId) {
      var deferred = $q.defer();      
      this.getResidentsInCommunity(regionName).then(function(neighborList) {
        for(var i=0;i<neighborList.length;i++) {
          var user=null;
          if(neighborList[i].get("user").id==userId) {
            user=neighborList[i];
            break;
          }
        }
        if(user==null) {
          deferred.reject("Unable to find the resident.");
        } else {
          deferred.resolve(user);
        }
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;       
    },    
    getTestListOfHomesInCommunity: function(regionName) {
      var deferred = $q.defer();      
      this.getResidentsInCommunity(regionName).then(function(neighborList) {
        var homeList=[];
        var runningHomeNo="";
        for(var i=0;i<neighborList.length;i++) {
          if(neighborList[i].get("homeNo")!=null && runningHomeNo!=neighborList[i].get("homeNo")) {
            runningHomeNo=neighborList[i].get("homeNo");
            homeList.push({label: runningHomeNo, value: runningHomeNo});
          }
        }
        deferred.resolve(homeList);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;  
    },
    getListOfHomesInCommunity: function(regionName) {
      var deferred = $q.defer();      
      this.getAllHomes(regionName).then(function(homeList) {
        var homeListArray=[];
        for(var i=0;i<homeList.length;i++) {
          homeListArray.push({label: homeList[i].get("homeNo"), value: homeList[i].get("homeNo")});
        }
        deferred.resolve(homeListArray);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;  
    },
    getHomeRecordFromAvailableHomes: function(homesList, homeNo) {
      for(var i=0;i<homesList.length;i++) {
        if(homesList[i].value==homeNo) {
          return homesList[i];
        }
      }
      return homesList[0];
    },
    validateInvitationCode: function(invitationCode) {
      var self=this;
      var deferred = $q.defer();
      var userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo("objectId", invitationCode);
      userQuery.first(function(user) {
        if(user!=null) {
          // if(user.get("status")=="P" || self.isLogoutAllowed(user)) {
            Parse.User.logIn(user.getUsername(), "custom", {
              success: function(authoritativeUser) {
                authoritativeUser.set("status", "A");
                authoritativeUser.save();                
                deferred.resolve(authoritativeUser);
              }, error: function(error) {
                deferred.reject(error);
              }
            });            
          // } else {
          //   deferred.reject(new Parse.Error(5001, "Invitation code has already been used."));  
          // }
        } else {
          deferred.reject(new Parse.Error(5001, "Unable to find invitation code."));  
        }
      }, function(error) {
        deferred.reject(error);
      });    
      return deferred.promise;      
    },
    validatePIN: function(phoneNum, pin) {
      var self=this;
      var deferred = $q.defer();
      var userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo("phoneNum", phoneNum);
      // userQuery.equalTo("pin", pin);
      userQuery.first(function(user) {
        if(user!=null) {
          console.log("User entered pin " + pin + " Pin in the system : " + user.get("pin"));
            if(user.get("pin")==null || user.get("pin").length==0 || user.get("pin")==pin) {
              Parse.User.logIn(user.getUsername(), "custom", {
                success: function(authoritativeUser) {
                  authoritativeUser.set("status", "A");
                  if(user.get("pin")==null || user.get("pin").length==0) {
                    authoritativeUser.set("changePin", "Y");
                  }
                  authoritativeUser.save();                
                  deferred.resolve(authoritativeUser);
                }, error: function(error) {
                  deferred.reject(error);
                }
              });            
            } else {
              deferred.reject(new Parse.Error(5002, "You have entered invalid PIN."));                
            }
        } else {
          deferred.reject(new Parse.Error(5001, "You have entered invalid PIN. Have you received invitation from your association?"));  
        }
      }, function(error) {
        deferred.reject(error);
      });    
      return deferred.promise;      
    },    
    sendNotificationToHomeOwner: function(homeNo, message) {
      this.getResidentsOfHome(Parse.User.current().get("residency"), homeNo).then(function(residents) {
        var residentIdList=[];
        if(residents!=null && residents.length>0) {
          for(var i=0;i<residents.length;i++) {
            residentIdList.push(residents[i].id);
          }
        }
        if(residentIdList.length>0) {
          NotificationService.pushNotificationToUserList(residentIdList, message);  
        }
      }, function(error) {
        LogService.log({type:"ERROR", message: "Failed to send payment notifications " + JSON.stringify(error) + " residency : " + residency + " homeNo : " + homeNo}); 
      });
    },
    sendNotificationToResident: function(message, userId) {
      var residentIdList=[];
      residentIdList.push(userId);
      NotificationService.pushNotificationToUserList(residentIdList, message);  
    },
    getSelfLegisContacts:function(residency) {
      var deferred = $q.defer();      
      this.getResidentsInCommunity(residency).then(function(neighborList) {
        var residentList=[];
        if(neighborList!=null) {
          for(var i=0;i<neighborList.length;i++) {
            if(neighborList[i].get("role")=="LEGI") {
              residentList.push(neighborList[i]);
            }
          }
        }
        deferred.resolve(residentList);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred.promise;  
    },
    setCommunityAddress:function(info){
      this.communityAddress=info;
    },
    getCommunityAddress:function(){
      return communityAddress;
    },    
    setCommunityInfo:function(info){
      this.communityInfo=info;
    },
    getCommunityInfo:function(){
      return communityInfo;
    },    
    setYourInfo:function(info){
      this.yourInfo=info;
    },
    getYourInfo:function(){
      return yourInfo;
    },    
    createNewCommunity:function(){
      var Region = Parse.Object.extend("Region");
      var region = new Region();
      var demography = {"units":this.communityInfo.noOfUnits, "est":this.communityInfo.year}
      var addressList = [];
      var communityAddress = {"name":this.communityInfo.name, "addressLine1":this.communityAddress.addressLine1, 
        "addressLine2":this.communityAddress.addressLine2,
        "city":this.communityAddress.city,
        "state":this.communityAddress.state,
        "pincode":this.communityAddress.pinCode,
        type:"DEFAULT"
      }
      addressList.push(communityAddress);      
      if(this.communityInfo.builderName!=null && this.communityInfo.builderName.length>0) {
        addressList.push({"name":this.communityInfo.builderName, type:"DEFAULT"});        
      }
      region.set("demography",demography);
      region.set("execOffAddrList",addressList);
      region.set("legiRepList",[]);
      region.set("name",this.communityInfo.name);
      region.set("parentRegion",[]);
      region.set("serviceContactList",[]);
      region.set("financials",[]);
      region.set("posterImages",[]);
      
      var defaultRegionSettings=REGION_SETTINGS;
      defaultRegionSettings.multiBlock=this.communityInfo.multiBlock;
      defaultRegionSettings.areaCode=this.communityAddress.country.countryCode;
      defaultRegionSettings.locale=this.communityAddress.country.locale;
      region.set("settings",defaultRegionSettings);

      region.set("type",INITIAL_REGION_TYPE);
      region.set("legiTitles",LEGI_DEFAULT_ROLES);      
      var currentDate=new Date();
      region.set("uniqueName",this.convertToLowerAndAppendUndScore(this.communityInfo.name)+currentDate.getMonth()+"_"+currentDate.getDate()+"_"+currentDate.getMilliseconds()+"_"+this.convertToLowerAndAppendUndScore(this.communityAddress.city.toLowerCase()));
      return region.save();
    },
    createNewCommunityAdmin:function(region){
      var user=new Parse.User();
      user.set("username",this.communityAddress.country.countryCode+this.yourInfo.phoneNum);
      user.set("password","custom");
      user.set("countryCode",this.communityAddress.country.countryCode);
      user.set("firstName",this.yourInfo.firstName);
      user.set("lastName",this.yourInfo.lastName);
      // TODO :: User block number in home number setting
      user.set("homeNo",UtilityService.generateHomeNumber(this.yourInfo.blockNo, this.yourInfo.unitNo));
      user.set("notifySetting",true);
      user.set("phoneNum",this.yourInfo.phoneNum);
      user.set("residency",region.get("uniqueName"));
      user.set("role","SUADM");
      user.set("superAdmin",true);
      user.set("status","A");
      user.set("deviceReg", "N");
      user.set("homeOwner",this.yourInfo.homeOwner);      
      user.set("tourGuide", "PEND");
      return user.signUp();
    },
    convertToLowerAndAppendUndScore:function(inputString){
      var resultString="";
      var splitInput=inputString.toLowerCase().split(" ");
      for(var i=0; i < splitInput.length; i++){
        resultString+=splitInput[i]+"_";
      }
      return resultString;
    },
    getAllHomes: function(regionUniqueName) {
      var deferred = $q.defer();
      var cachedObjectInfo=homesCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        console.log("Found dues in cache");
        deferred.resolve(homesCache.get(regionUniqueName));  
      } else {
        var Home = Parse.Object.extend("Home");
        var query = new Parse.Query(Home);
        query.equalTo("residency",regionUniqueName);
        query.ascending("homeNo");
        query.limit(1000);
        query.find(function(homes) {
          if(homes!=null && homes.length==1000) {
            query.skip(1000);
            query.find(function(homes1) {
              homesCache.remove(regionUniqueName);
              var finalHomes=homes.concat(homes1);
              homesCache.put(regionUniqueName, finalHomes);          
              console.log("Queried homes to cache greater than 1000");
              deferred.resolve(finalHomes);              
            }, function(error) {
              if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
                console.log("Failed to get homes from cache");
                deferred.resolve(homesCache.get(regionUniqueName));  
              } else {
                deferred.reject(error);
              }
            });
          } else {
            homesCache.remove(regionUniqueName);
            homesCache.put(regionUniqueName, homes);          
            console.log("Queried homes to cache less than 1000");
            deferred.resolve(homes);
          }
        }, function(error) {
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Failed to get homes from cache");
            deferred.resolve(homesCache.get(regionUniqueName));  
          } else {
            deferred.reject(error);
          }
        }); 
      }
      return deferred.promise;
    },    
    getUniqueBlocks: function(homes){
      var blocks=[];
      for(var i=0; i<homes.length; i++){
        blocks.push(homes[i].get("blockNo"));
      }
      var uniqueBlocks=blocks.filter(this.filterUniqueBlocks);
      return uniqueBlocks;
    }, 
    filterUniqueBlocks: function(value, index, self){
      return value!=null && self.indexOf(value) === index;
    },   
    refreshHomesCache: function(regionUniqueName) {
      console.log("homes removed from cache");
      homesCache.remove(regionUniqueName);
    },    
    addHome: function(inputHome) {
      this.refreshHomesCache(inputHome.residency);
      var Home = Parse.Object.extend("Home");
      var home=new Home();      
      home.set("homeNo", UtilityService.generateHomeNumber(inputHome.blockNo, inputHome.unitNo));
      home.set("unitNo", inputHome.unitNo);      
      if(inputHome.blockNo!=null && inputHome.blockNo.trim().length>0) {
        home.set("blockNo", inputHome.blockNo.toUpperCase());
      }
      home.set("residency", inputHome.residency);
      return home.save();
    },
    addHomes: function(regionUniqueName, inputHomes, blockNo, noOfSqFt, noOfBedRooms) {
      this.refreshHomesCache(regionUniqueName);
      var homesArray=[];
      for(var i=0;i<inputHomes.length;i++) {
        var Home = Parse.Object.extend("Home");              
        var home=new Home();
        home.set("residency", regionUniqueName);                
        home.set("unitNo", inputHomes[i]);
        home.set("homeNo", UtilityService.generateHomeNumber(blockNo, inputHomes[i]));
        if(blockNo!=null && blockNo.trim().length>0) {
          home.set("blockNo", blockNo.trim().toUpperCase());
        }        
        if(noOfSqFt>0) {
          home.set("noOfSqFt", noOfSqFt);
        }        
        if(noOfBedRooms>0) {
          home.set("noOfBedRooms", noOfBedRooms);
        }
        homesArray.push(home);
      }
      return Parse.Object.saveAll(homesArray);
    },  
    getHomeByHomeNo: function(homeNo){
      var deferred = $q.defer();
      this.getAllHomes(this.getUserResidency()).then(function(homes){
        for(var i=0;i<homes.length;i++){
          if(homes[i].get("homeNo")==homeNo) {
            deferred.resolve(homes[i]);  
          }
        }
        deferred.reject("Unable to find requested home");
      },function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    },
    updateHomeNumber: function(home, inputHome) {
      var deferred = $q.defer();
      var self=this;            
      var oldHomeNo=home.get("homeNo");
      home.set("homeNo", inputHome.homeNo);
      home.set("noOfSqFt", inputHome.noOfSqFt);
      home.set("noOfBedRooms", inputHome.noOfBedRooms);
      home.save().then(function(updatedHome){
        console.log("Home number updated");
        self.refreshHomesCache(inputHome.residency);
        if(inputHome.homeNumberChanged==true) {
          // Update residents in this home
          var residentsToUpdatePromises=[];
          self.getResidentsOfHome(inputHome.residency, oldHomeNo).then(function(residents){
            console.log("Looking for " + inputHome.residency + " home no " + oldHomeNo);
            for(var i=0;i<residents.length;i++){
              console.log("Modify user : " + residents[i].id);
              residents[i].set("homeNo", inputHome.homeNo);
              residentsToUpdatePromises.push(residents[i].save());
              // residentsToUpdatePromises.push(
              //   Parse.Cloud.run('modifyUser', { targetUserId: residents[i].id, userObjectKey: 'homeNo', userObjectValue: inputHome.homeNo})
              // );              
            }
            if(residentsToUpdatePromises.length>0){
              console.log("No of users being updated " + residentsToUpdatePromises.length);
              $q.all(residentsToUpdatePromises).then(function(result){
                console.log("User update is success "  + JSON.stringify(updatedHome));
                self.refreshResidentCache(inputHome.residency);                          
                deferred.resolve(updatedHome);
              }, function(error){
                console.log("User update is failed");
                deferred.reject(error);
              });
            } else {
              console.log("No need to update any " + JSON.stringify(updatedHome));
              deferred.resolve(updatedHome);
            }
          }, function(error){
            deferred.reject(error);
          });
        } else {
          console.log("No need to update home numbers.");
          deferred.resolve(updatedHome);
        }
      },function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    },
    createUserResidency: function(user){
      var UserResidency = Parse.Object.extend("UserResidency");
      var userResidency = new UserResidency();
      userResidency.set("user", user);
      userResidency.set("homeNo", user.get("homeNo"));
      userResidency.set("homeOwner", user.get("homeOwner")==true?true:false);
      userResidency.set("residency", user.get("residency"));
      userResidency.set("role",user.get("role"));
      return userResidency.save();
    },
    createUserResidencyForAdmin: function(inputUser, user, region) {
      var UserResidency = Parse.Object.extend("UserResidency");
      var userResidency = new UserResidency();
      userResidency.set("user", user);
      userResidency.set("homeNo", inputUser.unitNo);
      userResidency.set("homeOwner", inputUser.homeOwner==true?true:false);
      userResidency.set("residency", region.get("uniqueName"));
      userResidency.set("role","SUADM");
      return userResidency.save();  
    },
    updateUserForNewCommunity: function(user, userResidency) {
      user.set("role", userResidency.get("role"));
      user.set("homeNo", userResidency.get("homeNo"));
      user.set("homeOwner", userResidency.get("homeOwner"));
      user.set("residency", userResidency.get("residency"));
      user.set("superAdmin",true);
      return user.save();
    },
    createUserResidencyWhenUserExists: function(inputUser, user) {
      var UserResidency = Parse.Object.extend("UserResidency");
      var userResidency = new UserResidency();
      userResidency.set("user", user);
      userResidency.set("homeNo", inputUser.homeNumber);
      userResidency.set("homeOwner", inputUser.homeOwner==true?true:false);
      userResidency.set("residency", this.getUserResidency());
      userResidency.set("role","CTZEN");
      return userResidency.save();  
    },
    switchResidency: function(userResidency){
      var user = this.getUser();
      user.set("homeNo", userResidency.get("homeNo"));
      user.set("homeOwner", userResidency.get("homeOwner"));
      user.set("role", userResidency.get("role"));
      user.set("residency", userResidency.get("residency"));
      user.set("title", userResidency.get("title"));
      return user.save();
    },
    updateUserResidency: function(userResidency){
      var user = this.getUser();
      userResidency.set("homeNo", user.get("homeNo"));
      userResidency.set("homeOwner", user.get("homeOwner"));
      userResidency.set("role", user.get("role"));
      userResidency.set("title", user.get("title"));
      return userResidency.save();
    }, 
    removeUserResidency: function(userResidency) {
      return userResidency.destroy();
    },
    addVehicleToUser: function(userResidency, vehicle) {
      var user = this.getUser();
      var currentVehicleList=userResidency.get("vehicleList");
      if(currentVehicleList!=null && currentVehicleList.length>0) {
        currentVehicleList.push(vehicle);
      } else {
        currentVehicleList=[
          vehicle
        ];
      }
      userResidency.set("vehicleList", currentVehicleList);
      return userResidency.save();
    }
  };
}]);