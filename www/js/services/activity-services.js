angular.module('activity.services', [])

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

;
