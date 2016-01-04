angular.module('starter.controllers', ['ngCordova', 'ionic'])

.controller('TabsCtrl', function($scope) {
  $scope.badges = {
    activity : 0
  };      
})

.controller('DashboardCtrl', function($scope, $state, $http, $ionicLoading, NotificationService, LogService, ActivityService, RegionService, $cordovaDialogs, $ionicActionSheet, $timeout, AccountService, SettingsService) {
  $scope.activityError=null;
  $scope.debateList=[];
  $scope.argumentMessageList=[];
  $scope.commentStatusList=[];
  $scope.user=Parse.User.current();
  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner> Finding activity in " + $scope.user.get("residency").capitalizeFirstLetter()
  });
  console.log("Activity controller");

  $scope.appMessage=SettingsService.getAppMessage();
  console.log("App message : " + $scope.appMessage);

  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  var regionList=RegionService.getRegionHierarchy();
  console.log("Region list to get activity : " + JSON.stringify(regionList));
  query.containedIn("regionUniqueName", regionList);
  if(AccountService.canUpdateRegion()) {
    query.containedIn("status", ["A","S"]);
  } else {
    query.equalTo("status", "A");  
  }
  query.include("user");
  query.descending("createdAt");
  query.find({
    success: function(activityList) {

        if(activityList!=null && activityList.length>0) {
          $scope.activities=activityList;  
          $scope.notifyUserUnreadActivityCount();

          var UserActivity = Parse.Object.extend("UserActivity");
          var userActivityQuery=new Parse.Query(UserActivity);
          userActivityQuery.equalTo("user", $scope.user);
          userActivityQuery.find({
            success: function(userActivityList) {
              $scope.$apply(function(){ 
                if(userActivityList!=null) {
                  $scope.userActivityList=userActivityList;
                  for(var k=0;k<activityList.length;k++) {
                    $scope.argumentMessageList.push("");
                    $scope.debateList.push(null);
                    $scope.commentStatusList.push(false);
                  }
                } else {
                  $scope.userActivityList=[];
                }
              });
              $ionicLoading.hide();              
            },
            error: function(error) {
              console.log("Unable to get activities : " + error.message);
              $scope.activityError=SettingsService.getControllerInfoMessage("Unable to get activities.");            
              $ionicLoading.hide();
            }
          });

        } else {
          $scope.activityError=SettingsService.getControllerInfoMessage("No activity found in your region.");
          $ionicLoading.hide();          
        }
    }, 
    error: function(error) {
      $scope.$apply(function(){
        console.log("Unable to get activities : " + error.message);
        $scope.activityError=SettingsService.getControllerInfoMessage("Unable to get activities.");            
        $ionicLoading.hide();
      });
    }
  });

  $scope.notifyUserUnreadActivityCount=function() {
    var lastActivityViewTimestamp=SettingsService.getPreference("lastActivityView"); 
    console.log("Last activity view : " + lastActivityViewTimestamp);
    if(lastActivityViewTimestamp!=null) {
      var unreadCount=0;
      for(var i=0;i<$scope.activities.length;i++) {
        if($scope.activities[i].createdAt.getTime()>lastActivityViewTimestamp) {
          unreadCount++;
        } else {
          break;
        }
      }
      if(unreadCount>10) {
        $scope.$parent.badges.activity="10+";
      } else {
        $scope.$parent.badges.activity=unreadCount;
      }
    }
    SettingsService.setPreference("lastActivityView", new Date().getTime());
  }

  $scope.beginDebate=function(activityId, index) {
    if(!$scope.isDebateRequested(activityId, index)) {
      var Debate = Parse.Object.extend("Debate");
      var query = new Parse.Query(Debate);
      query.equalTo("activity", $scope.activities[index]);
      if(AccountService.canUpdateRegion()) {
        query.containedIn("status", ["A","S"]);
      } else {
        query.equalTo("status", "A");  
      }      
      query.include("user");
      query.descending("createdAt");
      query.find({
        success: function(debates) {
          $scope.$apply(function(){
            if(debates!=null && debates.length>0) {
              $scope.debateList[index]=debates;
            } else {
              console.log("No arguments found for activity " + activityId);
              $scope.debateList[index]=[];
            }
          });
        },
        error: function(activity, error) {
          console.log("Error retrieving arguments of a debate " + error.message);
        }
      });          
    }
    $scope.commentStatusList[index]=$scope.commentStatusList[index]?false:true;
  };

  $scope.isDebateRequested=function(activityId, index) {
    return $scope.commentStatusList[index];
    // if($scope.debateList[index]!=null) {
    //   return true;
    // } else {
    //   return false;
    // }
  };

  $scope.postDebateArgument=function(activityId, index) {
    if($scope.argumentMessageList[index]==null || $scope.argumentMessageList[index].length==0) {
      $cordovaDialogs.alert('Please enter the feedback', 'Feedback', 'OK');
      return;
    }

    var badwords=ActivityService.getBadWordsFromMesage($scope.argumentMessageList[index]);
    if(badwords!=null && badwords.length>0) {
      $cordovaDialogs.alert("Please remove bad words " + JSON.stringify(badwords) + " from the message.", 'Feedback', 'OK');
      return;
    }    

    var activity=$scope.activities[index];
    var Debate = Parse.Object.extend("Debate");
    var debate = new Debate();
    debate.set("user", Parse.User.current());
    debate.set("activity", activity);
    debate.set("status", "A");
    debate.set("argument", $scope.argumentMessageList[index]);
    
    debate.save(null, {
      success: function(newDebate) {
        $scope.$apply(function(){
          activity.increment("debate", 1);
          activity.save();              
          $scope.argumentMessageList[index]="";
          $scope.debateList[index].unshift(newDebate);
          // Send notification to all other commenetators and post author
          var notifyUsers=[activity.get("user").id]; 
          for(var i=0;i<$scope.debateList[index].length;i++) {
            var userId=$scope.debateList[index][i].get("user").id;
            if(notifyUsers.indexOf(userId)==-1) {
              notifyUsers.push(userId);  
            }
          }
          NotificationService.pushNotificationToUserList(notifyUsers, debate.get("argument"));
          console.log("Successfully added debate entry");          
        });
      },
      error: function(debate, error) {
        console.log("Error adding debate entry " + error.message);
      }
    });          

  };


  $scope.isThisActionChosen=function(activityId, action) {
    for(var j=0;j<($scope.userActivityList!=null?$scope.userActivityList.length:0);j++) {
      if($scope.userActivityList[j].get("activity").id==activityId) {
        if($scope.userActivityList[j].get("action")==ActivityService.getActionCode(action)) {
          if(action=="support") {
            return "calm";
          } else {
            return "assertive";
          }
        } else {
          return;
        }
      }
    }
    return;
  };

  $scope.respond=function(activityId, action) {
    var activities=$scope.activities;
    for(i=0; i<activities.length; i++) {
      if(activities[i].id==activityId) {

        var previousUserActivity=null;
        var userActivityList=$scope.userActivityList;
        for(var j=0;j<userActivityList.length;j++) {
          if(userActivityList[j].get("activity").id==activities[i].id) {
            previousUserActivity=userActivityList[j];
            break;
          }
        }

        if(previousUserActivity==null) {
          // User has did an action on this activity for first time, add UserActivity and then increment action
          var UserActivity = Parse.Object.extend("UserActivity");
          var userActivity = new UserActivity();
          userActivity.set("user", Parse.User.current());
          userActivity.set("activity", activities[i]);
//          userActivity.set("actionType", "V");  // Possible values, V- VOTE & D - DBAT
          userActivity.set("action", ActivityService.getActionCode(action));
          
          userActivity.save(null, {
            success: function(userActivity) {
              $scope.$apply(function(){
                $scope.userActivityList.push(userActivity);
                activities[i].increment(action, 1);
                activities[i].save();              
                console.log("Successfully associated user with activity");
              });
            },
            error: function(activity, error) {
              console.log("Error associating user with activity " + error.message);
            }
          });          

        } else if(previousUserActivity.get("action")==ActivityService.getActionCode(action)) {
          console.log("Selected same option. so ignoring the option");
        } else {
          var previousAction=previousUserActivity.get("action");
          previousUserActivity.set("action", ActivityService.getActionCode(action));
          previousUserActivity.save({
            success: function(userActivity) {
              // console.log("Update user activity is successful " + JSON.stringify(userActivity));
            },
            error: function(error) {
              console.log("Error while updating user activity : " + JSON.stringify(error));
            }
          });
          activities[i].increment(ActivityService.getAction(previousAction), -1);
          activities[i].increment(action, 1);
          activities[i].save({
            success: function(activity) {
              // console.log("Successfullly incremented the counters : " + JSON.stringify(activity));
            },
            error: function(error) {
              console.log("Error while incrementing counters : " + JSON.stringify(error));
            }
          });    
        }
        return;
      }
    }
    console.log("unable to find activity id " + activityId + " to perform " + action);
  };

  $scope.removePost=function(activityId, index) {
    if(ionic.Platform.isWebView()) {
      $cordovaDialogs.beep(1);
    }
    $cordovaDialogs.confirm('Do you want to remove this activity?', 'Remove Activity', ['Remove','Cancel'])
    .then(function(buttonIndex) {      
      // no button = 0, 'OK' = 1, 'Cancel' = 2
      console.log("Button index : " + buttonIndex);      
      if(buttonIndex==1) {
        ActivityService.removePost(activityId).then(function(post) {
          console.log("Removed post Successfullly");
          $scope.$apply(function() {
            $scope.activities.splice(index,1);      
          });          
        }, function(error) {
          console.log("Error removing post " + JSON.stringify(error));
        });
      } else {
        console.log("Canceled removal of activity");
      }
    });
  };

  $scope.reportActivitySpam=function(activityId, index) {
    $cordovaDialogs.confirm('Is this activity really spam?', 'Spam confirmation', ['Yes, it is spam','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.reportActivitySpam($scope.activities[index]);
        $scope.activities.splice(index, 1);
      } else {
        console.log("Canceled reporting of activity spam");
      }
    });    
  };

  $scope.removeActivitySpamFlag=function(activityId, index) {
    $cordovaDialogs.confirm('Do you really want to remove spam flag?', 'Spam confirmation', ['Not a spam','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        $scope.activities[index]=ActivityService.removeActivitySpamFlag($scope.activities[index]);
      } else {
        console.log("Canceled reporting of activity spam");
      }
    });    
  };  

  $scope.reportDebateSpam=function(debateId, activityIndex, debateIndex) {
    $cordovaDialogs.confirm('Is this response really spam?', 'Spam confirmation', ['Yes, it is spam','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.reportDebateSpam($scope.debateList[activityIndex][debateIndex]);
        $scope.debateList[activityIndex].splice(debateIndex, 1);      
      } else {
        console.log("Canceled reporting of response spam");
      }
    });    
  };

  $scope.removeDebateSpamFlag=function(debateId, activityIndex, debateIndex) {
    $cordovaDialogs.confirm('Do you really want to remove spam flag on this response?', 'Spam confirmation', ['Not a spam','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        $scope.debateList[activityIndex][debateIndex]=ActivityService.removeDebateSpamFlag($scope.debateList[activityIndex][debateIndex]);
      } else {
        console.log("Canceled reporting of response spam");
      }
    });    
  };  

  $scope.flagUserAbusive=function(activityId, index) {
    var activity=$scope.activities[index];
    // if(activity.get("user").id==Parse.User.current().id) {
    //   $cordovaDialogs.alert('Cannot self block. Please try other user.', 'Confirmation', 'OK');  
    //   return;
    // }
    $cordovaDialogs.confirm('Do you want to mark this user abusive?', 'User action confirmation', ['Yes, abusive','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.flagUserAbusive(activity);
        $cordovaDialogs.alert('User has been marked abusive. His content generation rights have been revoked.', 'Confirmation', 'OK');   
      } else {
        console.log("Canceled reporting of activity spam");
      }
    });    
  };  

  $scope.flagCommentUserAbusive=function(debateId, activityIndex, debateIndex) {
    $cordovaDialogs.confirm('Do you want to mark this user abusive?', 'Block user confirmation', ['Yes, abusive','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.flagUserAbusive($scope.debateList[activityIndex][debateIndex]);
        $cordovaDialogs.alert('User has been marked abusive. His content generation rights have been revoked.', 'Confirmation', 'OK');   
      } else {
        console.log("Canceled reporting of activity spam");
      }
    });    
  };  


  $scope.openAdminActionSheet=function(activityId, activityIndex, activityStatus) {
    $scope.actionSheetActivityId=activityId;
    $scope.actionSheetActivityIndex=activityIndex;
    $scope.actionSheetActivityStatus=activityStatus;
    // TODO :: Should this variable be created outside to avoid creation of dom everytime?
    var buttonsArray=[
         { text: 'Edit Post' },
         { text: 'Delete Post' }
      ];
      if($scope.actionSheetActivityStatus=="S") {
        buttonsArray.push({ text: 'Remove Spam Flag' });
      } else {
        buttonsArray.push({ text: 'Report Spam' });
      }
      buttonsArray.push({ text: 'Block User' });
    var hideSheet = $ionicActionSheet.show({
       buttons: buttonsArray,
       cancelText: 'Cancel',
       cancel: function() {
          console.log("Action has been cancelled");
        },
       buttonClicked: function(index) {
          if(index==0) { // Edit post
            $state.go("tab.editpost", {activityId: $scope.actionSheetActivityId});   
          } else if(index==1) { // Delete post
            $scope.removePost($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
          } else if(index==2) { // Report spam
            if(buttonsArray[index].text=="Report Spam") {
              $scope.reportActivitySpam($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
            } else {
              $scope.removeActivitySpamFlag($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
            }
          } else if(index==3) { // Flag user abusive
            $scope.flagUserAbusive($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
          } 
          return true;
       }
     });

    $timeout(function() {
         hideSheet();
       }, 5000);
  };

  $scope.openUserActionSheet=function(activityId, activityIndex) {
    $scope.actionSheetActivityId=activityId;
    $scope.actionSheetActivityIndex=activityIndex;
    // TODO :: Should this variable be created outside to avoid creation of dom everytime?
    var hideSheet = $ionicActionSheet.show({
       buttons: [
         { text: 'Edit Post' },
         { text: 'Delete Post' },
         { text: 'Report Spam' }
       ],
       cancelText: 'Cancel',
       cancel: function() {
          console.log("Action has been cancelled");
        },
       buttonClicked: function(index) {
          if(index==0) { // Edit post
            $state.go("tab.editpost", {activityId: $scope.actionSheetActivityId});   
          } else if(index==1) { // Delete post
            $scope.removePost($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
          } else if(index==2) { // Report spam
            $scope.reportActivitySpam($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
          } 
          return true;
       }
     });

    $timeout(function() {
         hideSheet();
       }, 5000);

  };

  $scope.openActionSheet=function(activityId, activityIndex) {
    $scope.actionSheetActivityId=activityId;
    $scope.actionSheetActivityIndex=activityIndex;
    // TODO :: Should this variable be created outside to avoid creation of dom everytime?
    var hideSheet = $ionicActionSheet.show({
       buttons: [
         { text: 'Report Spam' }
       ],
       cancelText: 'Cancel',
       cancel: function() {
          console.log("Action has been cancelled");
        },
       buttonClicked: function(index) {
          if(index==0) { // Report spam
            $scope.reportActivitySpam($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
          } 
          return true;
       }
     });

    $timeout(function() {
         hideSheet();
       }, 5000);

  };

})

.controller('ActivityCtrl', function($scope, $http, $stateParams, NotificationService, LogService, ActivityService) {
  $scope.activityDetailError=null;
  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.include("user");
  query.get($stateParams.activityId, {
    success: function(result) {
      $scope.$apply(function(){
          $scope.activity=result;  
      });
    }, 
    error: function(error) {
      $scope.$apply(function(){
        console.log("Unable to load this activity : " + error.message);
        $scope.activityDetailError="Unable to load this activity.";
      });
    }
  });

  $scope.respond=function(activityId, action) {
    var activity=$scope.activity;
    activity.increment(action);
    activity.save();
  };

})

.controller('PostActivityCtrl', function($scope, $http, $state, NotificationService, LogService, RegionService, ActivityService, AccountService, PictureManagerService, $ionicLoading, $cordovaDialogs, $translate, SettingsService) {

  var user=Parse.User.current();  
  var stateData=PictureManagerService.getState();
  console.log(JSON.stringify(stateData));
  $scope.post={"notifyMessage": (stateData.data.message!=null?stateData.data.message:"")};
  $scope.allowedActivities=ActivityService.getAllowedActivities(user.get("role"));
  $scope.allowedRegions=AccountService.getRegionsAllowedToPost(user.get("role"), user.get("residency"));
  $scope.selectChoices={selectedActivityType: $scope.allowedActivities[0], selectedRegion: $scope.allowedRegions[0]};  

  $scope.postErrorMessage=null;
  $scope.allowImageUpload=ionic.Platform.isWebView();
  $scope.pictureUploaded=stateData.imageUrl;

  displayActivityWarnMessage();
  $scope.submitPost=function() {
    $scope.postErrorMessage=null;
    if($scope.post.notifyMessage==null || $scope.post.notifyMessage.length<10 || $scope.post.notifyMessage.length>2048) {
      $scope.postErrorMessage=SettingsService.getControllerErrorMessage("Message should be minimum 10 and maximum 2048 characters.");
      return;
    }      

    var badwords=ActivityService.getBadWordsFromMesage($scope.post.notifyMessage);
    if(badwords!=null && badwords.length>0) {
      $scope.postErrorMessage=SettingsService.getControllerErrorMessage("Please remove bad words " + JSON.stringify(badwords) + " from the message.");
      return;
    }

    $scope.post.notifyMessage = ActivityService.toProperPost($scope.post.notifyMessage);
    $cordovaDialogs.confirm('Do you want to post this activity?', 'Post Activity', ['Post','Continue Edit']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
       
        $ionicLoading.show({
          template: "<ion-spinner></ion-spinner> Posting activity "
        });

        $scope.post.activityType=$scope.selectChoices.selectedActivityType.id;
        $scope.post.regionUniqueName=$scope.selectChoices.selectedRegion.id;   
        $scope.post.support=0;
        $scope.post.oppose=0;
        $scope.post.debate=0;
        $scope.post.status="A";
        $scope.post.user=Parse.User.current();
        if(PictureManagerService.getState().imageUrl!=null) {
          $scope.post.images=[PictureManagerService.getState().imageUrl];  
        }

        // alert(JSON.stringify($scope.post));
        var Activity = Parse.Object.extend("Activity");
        var activity = new Activity();
        activity.save($scope.post, {
          success: function(activity) {
            // Send the push notification
            NotificationService.pushNotification($scope.post.regionUniqueName, $scope.post.notifyMessage);
            $ionicLoading.hide();          
            // Push the new activity to the top of activity chart, probably through Activity service
            SettingsService.setAppSuccessMessage("Activity has been posted.");            
            $scope.$apply(function(){
              PictureManagerService.reset();
              $state.go("tab.dash");  
            });
          },
          error: function(activity, error) {
            console.log("Error in posting message " + error.message);
            $ionicLoading.hide();          
            $scope.postError=true;
            $scope.postErrorMessage=SettingsService.getControllerErrorMessage(error.message);
            $scope.$apply();
          }
        });

      } else {
        console.log("Canceled posting of activity");
      }
    });

  };  

  $scope.cancelPost=function(){
    $cordovaDialogs.confirm('Do you want to abort posting?', 'Cancel Post', ['Abort Post','Continue Edit']).then(function(buttonIndex) { 
      if(buttonIndex==1) {
        $state.go("tab.dash");
      } else {
        console.log("Canceled posting of activity");
      }
    });
  };

  $scope.goToAttachPicture=function() {
    PictureManagerService.setData({message: $scope.post.notifyMessage});
    $state.go("tab.picman");
  };

  $scope.handleActivitySelection=function() {
    displayActivityWarnMessage();
  };

  function displayActivityWarnMessage() {
    if($scope.selectChoices.selectedActivityType.id=="ASK") {
      $scope.postWarnMessage="Messages.PostActivityAskWarn";  
    } else if($scope.selectChoices.selectedActivityType.id=="ISSU") {
      $scope.postWarnMessage="Messages.PostActivityIssueWarn";  
    } else {
      $scope.postWarnMessage=null;  
    }
  };

})

.controller('EditPostActivityCtrl', function($scope, $http, $state, $stateParams, NotificationService, LogService, RegionService, ActivityService, AccountService, SettingsService) {
  var user=Parse.User.current();  
  $scope.allowedActivities=ActivityService.getAllowedActivities(user.get("role"));
  $scope.allowedRegions=AccountService.getRegionsAllowedToPost(user.get("role"), user.get("residency"));
  $scope.selectChoices={selectedActivityType: $scope.allowedActivities[0], selectedRegion: $scope.allowedRegions[0]};
  $scope.post={notifyMessage: ""};  

  // Retrieve post
  var Activity = Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.get($stateParams.activityId,{
    success: function(activity) {
      $scope.preActivity=activity;
      $scope.post.notifyMessage=activity.get("notifyMessage");
      $scope.selectChoices={selectedActivityType: ActivityService.getActivityTypeInAList(activity.get('activityType'), $scope.allowedActivities), selectedRegion: $scope.allowedRegions[0]};            
    }, 
    error: function(error) {
      console.log("Error while retrieving post to edit : " + JSON.stringify(error));
      $scope.postErrorMessage=SettingsService.getControllerErrorMessage("Unable to retrieve post to edit. Please try again later.");
    }
  });

  $scope.postErrorMessage=null;
  $scope.editPost=function() {

    var badwords=ActivityService.getBadWordsFromMesage($scope.post.notifyMessage);
    if(badwords!=null && badwords.length>0) {
      $scope.postErrorMessage=SettingsService.getControllerErrorMessage("Please remove bad words " + JSON.stringify(badwords) + " from the message.");
      return;
    }

    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10 && $scope.post.notifyMessage.length<2048) {
      $scope.preActivity.set("activityType", $scope.selectChoices.selectedActivityType.id);
      $scope.preActivity.set("regionUniqueName", $scope.selectChoices.selectedRegion.id);   
      $scope.preActivity.set("notifyMessage", ActivityService.toProperPost($scope.post.notifyMessage));

      $scope.preActivity.save(null, {
        success: function(activity) {
          // Push the new activity to the top of activity chart, probably through Activity service
          SettingsService.setAppSuccessMessage("Activity has been updated.");
          $state.go("tab.dash");  
        },
        error: function(activity, error) {
          // Notify user that post has failed
          console.log("Error in posting message " + error.message);
          $scope.postError=true;
          $scope.postErrorMessage=SettingsService.getControllerErrorMessage(error.message);
          $scope.$apply();
        }
      });
    } else {
      $scope.postErrorMessage=SettingsService.getControllerErrorMessage("Message should be minimum 10 and maximum 2048 characters.");
    }
  };

  $scope.cancelPost=function(){
    $state.go("tab.dash");
  };

});