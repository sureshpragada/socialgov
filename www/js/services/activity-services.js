angular.module('activity.services', [])

.factory('ActivityService', ['CacheFactory', '$http', '$q', 'AccountService', 'NotificationService', 'LogService', 'paragraph', 'RegionService', function(CacheFactory, $http, $q, AccountService, NotificationService, LogService, paragraph, RegionService) {

  var activityCache;
  if (!CacheFactory.get('activityCache')) {
    activityCache = CacheFactory('activityCache', {
      maxAge: 15 * 60 * 1000,
      deleteOnExpire: 'none'
    });
  }

  return {
    getActivityListFromCache: function() {
      var deferred = $q.defer();
      var cachedObjectInfo=activityCache.info("activityList");
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(activityCache.get("activityList"));  
      } else {
        var regionList=RegionService.getRegionHierarchy();      
        var Activity=Parse.Object.extend("Activity");
        var query=new Parse.Query(Activity);
        query.containedIn("regionUniqueName", regionList);
        query.containedIn("status", ["P", "A", "S"]);        
        query.include("user");
        query.descending("createdAt");
        query.find().then(function(activityList){
          activityCache.remove("activityList");
          activityCache.put("activityList", activityList);          
          deferred.resolve(activityList);
        }, function(error){
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Unable to refresh activity hence passing cached one "  + JSON.stringify(error));
            deferred.resolve(activityCache.get("activityList"));  
          } else {
            deferred.reject(error);
          }
        });
      }
      return deferred.promise;
    },    
    getUserActivityListFromCache: function() {
      var deferred = $q.defer();
      var cachedObjectInfo=activityCache.info("userActivityList");
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        deferred.resolve(activityCache.get("userActivityList"));  
      } else {
        var regionList=RegionService.getRegionHierarchy();      
        var UserActivity = Parse.Object.extend("UserActivity");
        var userActivityQuery=new Parse.Query(UserActivity);
        userActivityQuery.equalTo("user", AccountService.getUser());
        userActivityQuery.find().then(function(userActivityList){
          activityCache.remove("userActivityList");
          activityCache.put("userActivityList", userActivityList);          
          deferred.resolve(userActivityList);
        }, function(error){
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Unable to refresh user activity hence passing cached one " + JSON.stringify(error));
            deferred.resolve(activityCache.get("userActivityList"));  
          } else {
            deferred.reject(error);
          }
        });
      }
      return deferred.promise;
    },
    getActivityDataForDashboard: function() {
      var deferred=$q.all([
        this.getActivityListFromCache(),
        this.getUserActivityListFromCache()
      ]);
      return deferred;
    },
    refreshActivityCache: function() {
      activityCache.remove("activityList");
      activityCache.remove("userActivityList");
    },
    getActivityComments: function(activityId) {
      var Debate = Parse.Object.extend("Debate");
      var query = new Parse.Query(Debate);

      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      activity.set("id", activityId);

      query.equalTo("activity", activity);
      if(AccountService.canUpdateRegion()) {
        query.containedIn("status", ["A","S"]);
      } else {
        query.equalTo("status", "A");  
      }      
      query.include("user");
      query.descending("createdAt");
      return query.find(); 
    },
    postActivityComment: function(activity, newComment) {
      var deferred = $q.defer();
      var Debate = Parse.Object.extend("Debate");
      var debate = new Debate();
      debate.set("user", AccountService.getUser());
      debate.set("activity", activity);
      debate.set("status", "A");
      debate.set("argument", newComment);    
      debate.save().then(function(newDebate) {
        activity.increment("debate", 1);
        activity.save();              
        deferred.resolve(newDebate);
      },
      function(error) {
        deferred.reject(error);
      });          
      return deferred.promise;
    },
    getActivityById: function(activityId) {
      var Activity=Parse.Object.extend("Activity");
      var query=new Parse.Query(Activity);
      query.equalTo("objectId", activityId);
      return query.first();
    },
    addUserActivity: function(activity, type, action, addenda) { // choice could be index of the option chosen
      var UserActivity = Parse.Object.extend("UserActivity");
      var userActivity = new UserActivity();
      userActivity.set("user", AccountService.getUser());
      userActivity.set("activity", activity);
      userActivity.set("action", this.getActionCode(action));
      if(type=="POLL") {
        userActivity.set("votedIndex", addenda.pollVotedIndex);            
        userActivity.set("homeNo", addenda.homeNo);
      }      
      return userActivity.save();          
    },
    markProblemResolved: function(activity) {
      activity.set("problemStatus", "RESOLVED");
      return activity.save();
    },
    respondToPoll: function(activityId, votedIndex) {
      var self=this;
      var deferred = $q.defer();
      // Make a new call to get activity as others might be voting here
      this.getActivityById(activityId).then(function(refreshedActivity){
        var currentVotes=refreshedActivity.get("votes");
        currentVotes[votedIndex]=currentVotes[votedIndex]+1;
        refreshedActivity.set("votes", currentVotes);
        refreshedActivity.save().then(function(updatedActivity){
          // Save user action
          self.addUserActivity(updatedActivity, "POLL", "support", {pollVotedIndex: votedIndex, homeNo: AccountService.getUser().get("homeNo")}).
            then(function(newUserActivity){
            deferred.resolve(updatedActivity);  
          }, function(userActivityError){
            deferred.reject(userActivityError);
          });
        },function(activitySaveError){
          deferred.reject(activitySaveError);
        });
      },function(activityRetrieveError){
        deferred.reject(activityRetrieveError);
      });
      return deferred.promise;
    },
    getUserActionFromTheList: function(activityId, userActivityList) {            
      if(userActivityList!=null && userActivityList.length>0) {
        for(var j=0;j<userActivityList.length;j++) {
          if(userActivityList[j].get("activity").id==activityId) {
            return userActivityList[j];
          }
        }
      }
      return null;
    },
    isHomePerformedActivity: function(activity) {            
      var UserActivity = Parse.Object.extend("UserActivity");
      var userActivityQuery=new Parse.Query(UserActivity);
      userActivityQuery.equalTo("homeNo", AccountService.getUser().get("homeNo"));
      userActivityQuery.equalTo("activity", activity);      
      return userActivityQuery.find();      
    },    
    postActivity: function(post) {
      this.refreshActivityCache();
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      return activity.save(post);
    },
    postWelcomeActivity: function(region, postingUser) {      
      var post={
          activityType: "NOTF",
          regionUniqueName: region.get("uniqueName"),   
          support: 0,
          oppose: 0,
          debate: 0,
          status: "A",
          user: postingUser,
          notifyMessage: "Welcome to " + region.get("name") + " community!\n\nWe are using OurBlock app in our community to collaborate and manage resident and financial information.\n\nWe will collaborate with each other by sharing ideas, community problems and notifications to brainstorm them to come up with the best solutions."
        };
      return this.postActivity(post);
    },
    getAllowedActivities: function(user) {
      var allowedActivities=[ACTIVITY_LIST[0], ACTIVITY_LIST[1], ACTIVITY_LIST[2]];
      if(user!=null && user.get("role")!="CTZEN" || user.get("superAdmin")==true) {
        allowedActivities.unshift(ACTIVITY_LIST[3]);        
        allowedActivities.unshift(ACTIVITY_LIST[4]);
      }
      allowedActivities.push(ACTIVITY_LIST[5]);
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
    enableActivityToPublic: function(activity) {
      console.log("Enable activity to public " + activity.id);
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

;
