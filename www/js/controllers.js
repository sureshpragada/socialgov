angular.module('starter.controllers', ['ngCordova', 'ionic'])

.controller('DashboardCtrl', function($scope, $http, $ionicLoading, NotificationService, LogService, ActivityService, RegionService, $cordovaDialogs) {
  $scope.activityError=null;
  $scope.debateList=[];
  $scope.argumentMessageList=[];
  $scope.user=Parse.User.current();

  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner> Finding activity in " + $scope.user.get("residency")
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
              // console.log("Deabte notes : " + JSON.stringify(debates));
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
          // console.log("newly added debate entry : " + JSON.stringify(newDebate));
          $scope.debateList[index].unshift(newDebate);
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

.controller('PostActivityCtrl', function($scope, $http, $state, NotificationService, LogService, RegionService, ActivityService, AccountService) {

  var user=Parse.User.current();  
  $scope.post={"notifyMessage": ""};
  $scope.allowedActivities=ActivityService.getAllowedActivities(user.get("role"));
  $scope.allowedRegions=AccountService.getRegionsAllowedToPost(user.get("role"), user.get("residency"));
  $scope.selectChoices={selectedActivityType: $scope.allowedActivities[0], selectedRegion: $scope.allowedRegions[0]};  

  $scope.postErrorMessage=null;
  $scope.submitPost=function() {
    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10 && $scope.post.notifyMessage.length<2048) {
      $scope.post.activityType=$scope.selectChoices.selectedActivityType.id;
      $scope.post.regionUniqueName=$scope.selectChoices.selectedRegion.id;   
      $scope.post.support=0;
      $scope.post.oppose=0;
      $scope.post.debate=0;
      $scope.post.status="A";
      $scope.post.user=Parse.User.current();

      // alert(JSON.stringify($scope.post));
      var Activity = Parse.Object.extend("Activity");
      var activity = new Activity();
      activity.save($scope.post, {
        success: function(activity) {
          // Send the push notification
          NotificationService.pushNotification($scope.post.regionUniqueName, $scope.post.notifyMessage, function(response) {
            console.log("Response from pushNotification : " + JSON.stringify(response));
            LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
          }, function(error) {
            console.log("Error from pushNotification : " + JSON.stringify(error));
            LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
          });

          // Push the new activity to the top of activity chart, probably through Activity service
          $scope.$apply(function(){
            $state.go("tab.dash");  
          });
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

  $scope.goToAttachPicture=function() {
    $state.go("tab.picman");
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
      $scope.selectChoices={selectedActivityType: ActivityService.getActivityInAList(activity.get('activityType'), $scope.allowedActivities), selectedRegion: $scope.allowedRegions[0]};            
    }, 
    error: function(error) {
      console.log("Error while retrieving post to edit : " + JSON.stringify(error));
      $scope.postErrorMessage="Unable to retrieve post to edit. Please try again later.";
    }
  });

  $scope.postErrorMessage=null;
  $scope.editPost=function() {
    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10 && $scope.post.notifyMessage.length<2048) {
      $scope.preActivity.set("activityType", $scope.selectChoices.selectedActivityType.id);
      $scope.preActivity.set("regionUniqueName", $scope.selectChoices.selectedRegion.id);   
      $scope.preActivity.set("notifyMessage", $scope.post.notifyMessage);

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
