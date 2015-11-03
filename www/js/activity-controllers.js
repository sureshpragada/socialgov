angular.module('starter.controllers', ['ngCordova', 'ionic'])

.controller('DashboardCtrl', function($scope, $state, $http, $ionicLoading, NotificationService, LogService, ActivityService, RegionService, $cordovaDialogs, $ionicActionSheet, $timeout) {
  $scope.activityError=null;
  $scope.debateList=[];
  $scope.argumentMessageList=[];
  $scope.user=Parse.User.current();
  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner> Finding activity in " + $scope.user.get("residency").capitalizeFirstLetter()
  });

  // $scope.activities=ActivityService.getMockData();  
  var Activity=Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  var regionList=RegionService.getRegionHierarchy();
  // console.log("Region list to get activity : " + JSON.stringify(regionList));
  query.containedIn("regionUniqueName", regionList);
  query.equalTo("status", "A");
  query.include("user");
  query.descending("createdAt");
  query.find({
    success: function(activityList) {

        if(activityList!=null && activityList.length>0) {
          $scope.activities=activityList;  

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
                  }
                } else {
                  $scope.userActivityList=[];
                }
              });
              $ionicLoading.hide();              
            },
            error: function(error) {
              console.log("Unable to get activities : " + error.message);
              $scope.activityError="Unable to get activities.";              
              $ionicLoading.hide();
            }
          });

        } else {
          $scope.activityError="No activity found in your region.";
          $ionicLoading.hide();          
        }
    }, 
    error: function(error) {
      $scope.$apply(function(){
        console.log("Unable to get activities : " + error.message);
        $scope.activityError="Unable to get activities.";
        $ionicLoading.hide();
      });
    }
  });

  $scope.beginDebate=function(activityId, index) {
    if(!$scope.isDebateRequested(activityId, index)) {
      var Debate = Parse.Object.extend("Debate");
      var query = new Parse.Query(Debate);
      query.equalTo("activity", $scope.activities[index]);
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
  };

  $scope.isDebateRequested=function(activityId, index) {
    if($scope.debateList[index]!=null) {
      return true;
    } else {
      return false;
    }
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
            delete $scope.activities[index];      
          });          
        }, function(error) {
          console.log("Error removing post " + JSON.stringify(error));
        });
      } else {
        console.log("Canceled removal of activity");
      }
    });
  };

  $scope.reportActivitySpam=function(activityId) {
    ActivityService.reportActivitySpam(activityId);
    $cordovaDialogs.alert('Thank you for spotting the spam. We will take action on this post shortly.', 'Spam Report', 'OK');
  };

  $scope.reportDebateSpam=function(debateId) {
    ActivityService.reportDebateSpam(debateId);
    $cordovaDialogs.alert('Thank you for spotting the spam. We will take action on this post shortly.', 'Spam Report', 'OK');
  };

  $scope.openUserActionSheet=function(activityId, activityIndex) {
    $scope.actionSheetActivityId=activityId;
    $scope.actionSheetActivityIndex=activityIndex;
    // TODO :: Should this variable be created outside to avoid creation of dom everytime?
    var hideSheet = $ionicActionSheet.show({
       buttons: [
         { text: 'Edit Post' },
         { text: 'Delete Post' },
         { text: 'Report spam' }
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
            $scope.reportActivitySpam($scope.actionSheetActivityId);
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
         { text: 'Report spam' }
       ],
       cancelText: 'Cancel',
       cancel: function() {
          console.log("Action has been cancelled");
        },
       buttonClicked: function(index) {
          if(index==0) { // Report spam
            $scope.reportActivitySpam($scope.actionSheetActivityId);
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

.controller('PostActivityCtrl', function($scope, $http, $state, NotificationService, LogService, RegionService, ActivityService, AccountService, PictureManagerService, $ionicLoading, $cordovaDialogs, $translate) {

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
      $scope.postErrorMessage="Message should be minimum 10 and maximum 2048 characters.";
      return;
    }      


    var badwords=ActivityService.getBadWordsFromMesage($scope.post.notifyMessage);
    if(badwords!=null && badwords.length>0) {
      $scope.postErrorMessage="Please remove bad words " + JSON.stringify(badwords) + " from the message.";      
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
            $scope.$apply(function(){
              PictureManagerService.reset();
              $state.go("tab.dash");  
            });
          },
          error: function(activity, error) {
            console.log("Error in posting message " + error.message);
            $ionicLoading.hide();          
            $scope.postError=true;
            $scope.postErrorMessage=error.message;
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

.controller('EditPostActivityCtrl', function($scope, $http, $state, $stateParams, NotificationService, LogService, RegionService, ActivityService, AccountService) {
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
      $scope.postErrorMessage="Unable to retrieve post to edit. Please try again later.";
    }
  });

  $scope.postErrorMessage=null;
  $scope.editPost=function() {

    var badwords=ActivityService.getBadWordsFromMesage($scope.post.notifyMessage);
    if(badwords!=null && badwords.length>0) {
      $scope.postErrorMessage="Please remove bad words " + JSON.stringify(badwords) + " from the message.";      
      return;
    }

    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10 && $scope.post.notifyMessage.length<2048) {
      $scope.preActivity.set("activityType", $scope.selectChoices.selectedActivityType.id);
      $scope.preActivity.set("regionUniqueName", $scope.selectChoices.selectedRegion.id);   
      $scope.preActivity.set("notifyMessage", ActivityService.toProperPost($scope.post.notifyMessage));

      $scope.preActivity.save(null, {
        success: function(activity) {
          // Push the new activity to the top of activity chart, probably through Activity service
          $state.go("tab.dash");  
        },
        error: function(activity, error) {
          // Notify user that post has failed
          console.log("Error in posting message " + error.message);
          $scope.postError=true;
          $scope.postErrorMessage=error.message;
          $scope.$apply();
        }
      });
    } else {
      $scope.postErrorMessage="Message should be minimum 10 and maximum 2048 characters.";
    }
  };

  $scope.cancelPost=function(){
    $state.go("tab.dash");
  };

});
