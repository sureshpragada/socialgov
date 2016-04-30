angular.module('account.services', [])

.factory('AccountService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', 'UtilityService', '$q', function(CacheFactory, RegionService, NotificationService, LogService, UtilityService, $q) {
  var NO_DATA_FOUND_KEY="NO_DATA_FOUND";
  var userLastRefreshTimeStamp=null; //new Date().getTime();
  var communityAddress={};
  var communityInfo={
    multiBlock: false
  };
  var yourInfo={};

  var accessRequestCache;  
  if (!CacheFactory.get('accessRequestCache')) {
    accessRequestCache = CacheFactory('accessRequestCache', {
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
      var deferred = $q.defer();
      var cachedObjectInfo=residentCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(residentCache.get(regionUniqueName));  
        console.log("Returning from cache");
      } else {
        var userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("residency", regionUniqueName);
        userQuery.ascending("homeNo");
        userQuery.find(function(residents) {
            residentCache.remove(regionUniqueName);
            residentCache.put(regionUniqueName, residents);          
            console.log("Caching resident count " + residents!=null?residents.length:-1);
            deferred.resolve(residents);
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
      if(new Date().getTime()-userLastRefreshTimeStamp>(1 * 60 * 1000)) {
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
      this.refreshResidentCache();
      Parse.Cloud.run('modifyUser', { targetUserId: userId, userObjectKey: 'role', userObjectValue: role }, {
        success: function(status1) {
          console.log("Successfully updated user role " + JSON.stringify(status1));
          Parse.Cloud.run('modifyUser', { targetUserId: userId, userObjectKey: 'title', userObjectValue: title }, {
            success: function(status2) {
              console.log("Successfully updated user title " + JSON.stringify(status2));
              deferred.resolve("Successfully updated user title " + JSON.stringify(status2));
            },
            error: function(error) {
              LogService.log({type:"ERROR", message: "Unable to update user title " + JSON.stringify(error) + " UserId : " + userId}); 
              deferred.reject(error);
            }
          });      
        },
        error: function(error) {
          LogService.log({type:"ERROR", message: "Unable to update user role " + JSON.stringify(error) + " UserId : " + userId}); 
          deferred.reject(error);
        }
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
      user.set("homeNo", inputUser.homeNumber);
      user.set("bloodGroup", inputUser.bloodGroup!=null?inputUser.bloodGroup.toUpperCase():"");
      return user.save();
    },
    updateNeighborAccount: function(inputUser, neighbor) {
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
      if(inputUser.homeNo!=neighbor.get("homeNo")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'homeNo', userObjectValue: inputUser.homeNo }));
        console.log("Updating homeNo");
      }
      if(inputUser.homeOwner!=neighbor.get("homeOwner")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'homeOwner', userObjectValue: inputUser.homeOwner }));
        console.log("Updating homeOwner");
      }
      if(inputUser.country.countryCode!=neighbor.get("countryCode")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'countryCode', userObjectValue: inputUser.country.countryCode }));
        console.log("Updating countryCode");
      }      
      if(inputUser.phoneNum!=neighbor.get("phoneNum")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'phoneNum', userObjectValue: inputUser.phoneNum }));
        console.log("Updating homeNo");
      }
      if(inputUser.country.countryCode!=neighbor.get("countryCode") || inputUser.phoneNum!=neighbor.get("phoneNum")) {
        promises.push(Parse.Cloud.run('modifyUser', { targetUserId: neighbor.id, userObjectKey: 'username', userObjectValue: inputUser.country.countryCode+""+inputUser.phoneNum }));        
        console.log("Updating countryCode");
      }                  

      var deferred=$q.all(promises);
      return deferred;
    },
    getUserObjectByPhoneNumber: function(number){
      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.equalTo("phoneNum",number);
      query.find({
        success: function(results) {
          console.log(JSON.stringify(results));
          var objectId = results[0].id;
          var sentMessageCount = results[0].sentInviteMessageCount;
          console.log(objectId+" "+sentMessageCount);
          console.log(sentMessageCount==null);
          if(sentMessageCount==null || sentMessageCount<=3){
            console.log("yes");
            return objectId;
          }
          else{
            console.log("No");
            return null;
          }
        },
        error: function(error) {
          console.log("unable to find the user");
        }
      });
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
    getUserById: function(userId) {
      var userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo("objectId", userId);
      return userQuery.first();   
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
      return this.communityAddress;
    },    
    setCommunityInfo:function(info){
      this.communityInfo=info;
    },
    getCommunityInfo:function(){
      return this.communityInfo;
    },    
    setYourInfo:function(info){
      this.yourInfo=info;
    },
    getYourInfo:function(){
      return this.yourInfo;
    },    
    createNewCommunity:function(){
      var Region = Parse.Object.extend("Region");
      var region = new Region();
      var demography = {"units":this.communityInfo.noOfUnits, "est":this.communityInfo.year}
      var addressList = [];
      var communityAddress = {"name":this.communityAddress.name, "addressLine1":this.communityAddress.addressLine1, 
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
      region.set("name",this.communityAddress.name);
      region.set("parentRegion",[]);
      region.set("serviceContactList",[]);
      region.set("financials",[]);
      region.set("posterImages",[]);
      region.set("settings",REGION_SETTINGS);
      region.set("type",INITIAL_REGION_TYPE);
      region.set("legiTitles",LEGI_DEFAULT_ROLES);      
      var currentDate=new Date();
      region.set("uniqueName",this.convertToLowerAndAppendUndScore(this.communityAddress.name)+currentDate.getMonth()+"_"+currentDate.getDate()+"_"+currentDate.getMilliseconds()+"_"+this.communityAddress.city.toLowerCase());
      return region.save();
    },
    createNewCommunityAdmin:function(region){
      var user=new Parse.User();
      user.set("username","91"+this.yourInfo.phoneNum);
      user.set("password","custom");
      user.set("countryCode","91");
      user.set("firstName",this.yourInfo.firstName);
      user.set("lastName",this.yourInfo.lastName);
      user.set("homeNo",this.yourInfo.homeNo);
      user.set("notifySetting",true);
      user.set("phoneNum",this.yourInfo.phoneNum);
      user.set("residency",region.get("uniqueName"));
      user.set("role","SUADM");
      user.set("superAdmin",true);
      user.set("status","A");
      user.set("deviceReg", "N");
      user.set("homeOwner",this.yourInfo.homeOwner);      
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
        query.find(function(homes) {
            homesCache.remove(regionUniqueName);
            homesCache.put(regionUniqueName, homes);          
            console.log("Queried homes to cache");
            deferred.resolve(homes);
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
    refreshHomesCache: function(regionUniqueName) {
      console.log("homes removed from cache");
      homesCache.remove(regionUniqueName);
    },    
    addHome: function(inputHome) {
      this.refreshHomesCache(inputHome.residency);
      var Home = Parse.Object.extend("Home");
      var home=new Home();
      home.set("homeNo", inputHome.homeNo);
      home.set("residency", inputHome.residency);
      return home.save();
    },
    addHomes: function(regionUniqueName, inputHomes) {
      this.refreshHomesCache(regionUniqueName);
      var homesArray=[];
      for(var i=0;i<inputHomes.length;i++) {
        var Home = Parse.Object.extend("Home");              
        var home=new Home();
        home.set("homeNo", inputHomes[i]);
        home.set("residency", regionUniqueName);        
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
      home.save().then(function(updatedHome){
        console.log("Home number updated");
        self.refreshHomesCache(inputHome.residency);
        // Update residents in this home
        var residentsToUpdatePromises=[];
        self.getResidentsOfHome(inputHome.residency, oldHomeNo).then(function(residents){
          for(var i=0;i<residents.length;i++){
            residentsToUpdatePromises.push(
              Parse.Cloud.run('modifyUser', { targetUserId: residents[i].id, userObjectKey: 'homeNo', userObjectValue: inputHome.homeNo}));
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
      },function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    }    
  };
}]);