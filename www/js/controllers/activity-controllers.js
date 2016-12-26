angular.module('starter.controllers', ['ngCordova', 'ionic'])

.controller('TabsCtrl', function($scope, $ionicModal) {
  $scope.badges = {
    activity : 0
  };      

  $ionicModal.fromTemplateUrl('templates/choice-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.choiceModal = modal;
  })  

  $scope.closeChoiceModal = function() {
    $scope.choiceModal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.choiceModal.remove();
  });

  $scope.selectModalChoice=function(selectedIndex) {
    $scope.$broadcast ('choiceSelectionComplete', {choiceName: $scope.choiceName, selected: selectedIndex});
    $scope.choiceModal.hide();
  };

  $scope.openChoiceModal=function(choiceName, choices) {    
    $scope.choiceName=choiceName;
    $scope.modalChoices=choices;
    $scope.choiceModal.show();    
  };

})

.controller('DashboardCtrl', function($scope, $state, $http, $ionicLoading, NotificationService, LogService, ActivityService, RegionService, $cordovaDialogs, $ionicActionSheet, $timeout, AccountService, SettingsService, $ionicModal, $ionicScrollDelegate, $cordovaClipboard) {
  SettingsService.trackView("Activity controller");
  $scope.debateList=[];
  $scope.legiContactsList=[];
  $scope.user=AccountService.getUser();
  $scope.isAdmin=AccountService.canUpdateRegion();
  $scope.isHomeOwner=AccountService.isHomeOwner();
  $scope.appMessage=SettingsService.getAppMessage();
  $ionicLoading.show(SettingsService.getLoadingMessage("Finding activity"));
  ActivityService.getActivityDataForDashboard().then(function(activityDashboardData){
    $scope.activities=activityDashboardData[0];
    var filterActivity=false;
    for(var j=0;j<$scope.activities.length;j++) {
      if($scope.isAdmin==false) {        
        // Admin sees everything; he should delete post if it true spam to avoid bloating of activity view
        // Start filtering posts by status
        if($scope.activities[j].get("status")=="S") {
          // Residents do not see spam content
          filterActivity=true;
        } else if($scope.activities[j].get("status")=="P" && $scope.activities[j].get("user").id!=$scope.user.id) {
          // Residents do not see pending posts; unless they have posted the message
          filterActivity=true;
        } else if($scope.activities[j].get("notifyHomeOwners")==true && !$scope.isHomeOwner) {
          // Tenants do not see the posts that are posted for home owners
          filterActivity=true;
        } else if($scope.activities[j].get("blockToNotify")!=null && $scope.activities[j].get("blockToNotify")!="ALL") {
          // Residents do not see the posts of other blocks, if blockToNotify is specified
          var currentBlockNo=Parse.User.current().get("homeNo").substring(6, Parse.User.current().get("homeNo").indexOf(";"));
          if(currentBlockNo!=$scope.activities[j].get("blockToNotify")){
            filterActivity=true;
          }
        } else if($scope.activities[j].get("userToNotify")!=null && !$scope.isAdmin) {
          var currentUserId=Parse.User.current().id;
          if(currentUserId!=$scope.activities[j].get("userToNotify")){
            filterActivity=true; 
          }
        } else {
          // Filter by activity type
          if($scope.activities[j].get("activityType")=="POLL" && $scope.activities[j].get("pollSettings").whoCanVote=="HOME_OWNER" && $scope.user.get("homeOwner")==false) {
            // Residents who are not home owners are not allowed to vote home owner specific polls
            filterActivity=true;
          } else if($scope.activities[j].get("activityType")=="ISSU" && $scope.activities[j].get("problemType")=="PERSONAL" && $scope.activities[j].get("user").id!=$scope.user.id) {
            // Residents can see their non community (personal) problems
            filterActivity=true;
          }
        }
      }
      if(filterActivity==true) {
        $scope.activities.splice(j, 1);
      }
      filterActivity=false;      
    }
    if($scope.activities!=null && $scope.activities.length>0) {
      $scope.notifyUserUnreadActivityCount();
      $scope.userActivityList=activityDashboardData[1];
      for(var k=0;k<$scope.activities.length;k++) {
        $scope.debateList.push(null);
      }
    } 
    if($scope.activities==null || $scope.activities.length<=1) {
      $scope.tipMessage=SettingsService.getControllerIdeaMessage("Have a development idea, problem or a question to your community? Let's collaborate by posting your thoughts.");
    }
    $ionicLoading.hide();          
  }, function(error){
    LogService.log({type:"ERROR", message: "Unable to get community activities " + JSON.stringify(error) + " residency : " + $scope.user.get("residency")}); 
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get your community activities.");            
    $ionicLoading.hide();
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

  $ionicModal.fromTemplateUrl('templates/activity/activity-feedback-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.commentsModal = modal;
  })  

  $scope.closeCommentsModal = function() {
    $scope.commentsModal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.commentsModal.remove();
  });

  $scope.copyActivityMessage=function(activityIndex) {
    $cordovaClipboard.copy($scope.activities[activityIndex].get("notifyMessage")).then(function () {
      $cordovaDialogs.alert('Activity is copied to the clipboard.', 'Copy Success', 'OK');   
    }, function () {
      $cordovaDialogs.alert('Unable to copy activity to clipboard.', 'Copy Failure', 'OK');   
    });
  };  

  $scope.beginDebate=function(activityId, index) {
    SettingsService.trackEvent("Activity", "BeginDebate");
    $scope.postComment={
      data: null, 
      activityIndex: index
    };
    if($scope.debateList[index]==null) {
      ActivityService.getActivityComments(activityId).then(function(comments){
        if(comments!=null && comments.length>0) {
          console.log("Comments size is good " + JSON.stringify(comments));
          $scope.debateList[index]=comments;  
        } else {
          console.log("No comments");
          $scope.debateList[index]=[];  
          $scope.commentPostMessage=SettingsService.getControllerIdeaMessage("Be the first one to comment on this activity.");
        }              
        $scope.$apply();
      }, function(error){
        console.log("Unable to get comments " + JSON.stringify(error));
        $scope.commentPostMessage=SettingsService.getControllerErrorMessage("Unable to get comments of this activity.");
      });         
    }
    $scope.commentsModal.show();
  };

  $scope.postDebateArgument=function() {
    console.log("Posting comment started " + $scope.postComment.data);
    SettingsService.trackEvent("Activity", "PostDebate");
    if($scope.postComment.data==null || $scope.postComment.data.trim().length==0) {
      $scope.commentPostMessage=SettingsService.getControllerErrorMessage("Please enter your comment.");
      return;
    }

    var badwords=ActivityService.getBadWordsFromMesage($scope.postComment.data);
    if(badwords!=null && badwords.length>0) {
      console.log("Found bad words");
      $scope.commentPostMessage=SettingsService.getControllerErrorMessage("Please remove bad words " + JSON.stringify(badwords) + " from the message.");      
      return;
    }

    console.log("No bad words");
    ActivityService.postActivityComment($scope.activities[$scope.postComment.activityIndex], $scope.postComment.data).then(function(newDebate){
      console.log("Successfullly posted your message");
      $scope.debateList[$scope.postComment.activityIndex].unshift(newDebate);      
      // Send notification to all other commenetators and post author
      var notifyUsers=[$scope.activities[$scope.postComment.activityIndex].get("user").id]; 
      for(var i=0;i<$scope.debateList[$scope.postComment.activityIndex].length;i++) {
        var userId=$scope.debateList[$scope.postComment.activityIndex][i].get("user").id;
        if(notifyUsers.indexOf(userId)==-1) {
          notifyUsers.push(userId);  
        }
      }
      $scope.postComment.data="";
      NotificationService.pushNotificationToUserList(notifyUsers, newDebate.get("argument"));
    }, function(error){
      LogService.log({type:"ERROR", message: "Unable to post comment  " +  JSON.stringify(error)}); 
      $scope.commentPostMessage=SettingsService.getControllerErrorMessage("Unable to post your comment.");
    });

  };

  $scope.isPollExpired=function(index) {
    if($scope.activities[index].get("endDate").getTime()<new Date().getTime()) {
      return true;
    } else {
      return false;
    }
  };

  $scope.isThisActionChosen=function(activityId, action) {
    if($scope.userActivityList!=null) {
      for(var j=0;j<$scope.userActivityList.length;j++) {
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

        var currentUser=AccountService.getUser();
        if(previousUserActivity==null) {
          // User has did an action on this activity for first time, add UserActivity and then increment action
          var UserActivity = Parse.Object.extend("UserActivity");
          var userActivity = new UserActivity();
          userActivity.set("user", currentUser);
          userActivity.set("activity", activities[i]);
//          userActivity.set("actionType", "V");  // Possible values, V- VOTE & D - DBAT
          userActivity.set("action", ActivityService.getActionCode(action));
          
          userActivity.save(null, {
            success: function(userActivity) {
              $scope.$apply(function(){
                $scope.userActivityList.push(userActivity);
                activities[i].increment(action, 1);
                activities[i].set("lastActionBy", currentUser.get("firstName") + " " + currentUser.get("lastName"));
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
          activities[i].set("lastActionBy", currentUser.get("firstName") + " " + currentUser.get("lastName"));
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

  $scope.openReactedPeopleList=function(activityIndex){

    console.log("Showing list of reacted people");
    ActivityService.getUserActivtiesByActivityId(activityIndex).then(function(userActivities){
      $scope.reactedPeople = userActivities;
      // console.log(JSON.stringify($scope.reactedPeople));
    },function(error){
      console.log("Unable to retrieve user activities " + JSON.stringify(error));
    });
    $scope.reactedPeopleModal.show();
  };


  $ionicModal.fromTemplateUrl('templates/activity/activity-reacted-people.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.reactedPeopleModal = modal;
  })  

  $scope.closeReactedPeopleModal = function() {
    $scope.reactedPeopleModal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.reactedPeopleModal.remove();
  });

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

  $scope.markProblemResolved=function(activityId, index) {
    $cordovaDialogs.confirm('Is problem really resolved?', 'Resolution confirmation', ['Yes, it is resolved','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.markProblemResolved($scope.activities[index]).then(function(updatedActivity){
          // Send notification to reporter of the problem and assigned if there is one
          var notifyUsers=[$scope.activities[index].get("user").id]; 
          NotificationService.pushNotificationToUserList(notifyUsers, "RESOLVED :: " + $scope.activities[index].get("notifyMessage"));
        }, function(error){
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to mark problem as resolved");
        });
      } else {
        console.log("Canceled marking of activity as resolved");
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

  $scope.enableActivityToPublic=function(activityId, index) {
    $cordovaDialogs.confirm('Do you want to enable this post to everyone in community?', 'Activation Confirmation', ['Yes, Enable','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.enableActivityToPublic($scope.activities[index]);
        NotificationService.pushNotification($scope.activities[index].get("regionUniqueName"), $scope.activities[index].get("notifyMessage"));              
      } else {
        console.log("Canceled enabling activity to enire community");
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

  $scope.deleteComment=function(debateId, activityIndex, debateIndex) {
    $cordovaDialogs.confirm('Do you really want to delete comment?', 'Delete comment', ['Yes','Cancel'])
    .then(function(buttonIndex) {      
      if(buttonIndex==1) {
        ActivityService.deleteComment($scope.activities[activityIndex], $scope.debateList[activityIndex][debateIndex]);
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

  $scope.respondToPoll=function(activityId, index) {
    SettingsService.setPageTransitionData({
      activity : $scope.activities[index],
      userActions: $scope.userActivityList 
    });
    $state.go("tab.view-poll-activity", {activityId: activityId});
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
      if($scope.actionSheetActivityStatus=="P") {
        buttonsArray.push({ text: 'Show to community' });
      }                  
    var hideSheet = $ionicActionSheet.show({
       buttons: buttonsArray,
       cancelText: 'Cancel',
       cancel: function() {
          console.log("Action has been cancelled");
        },
       buttonClicked: function(index) {
          if(index==0) { // Edit post
            if($scope.activities[$scope.actionSheetActivityIndex].get("activityType")=="POLL") {
              $cordovaDialogs.alert("Poll editing is not allowed after polling starts.", 'Edit Poll', 'Got it!').then(function() {});
            } else {
              $state.go("tab.editpost", {activityId: $scope.actionSheetActivityId});                 
            }
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
          } else if(index==4) { // Make this post public
            $scope.enableActivityToPublic($scope.actionSheetActivityId, $scope.actionSheetActivityIndex);
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
            if($scope.activities[$scope.actionSheetActivityIndex].get("activityType")=="POLL") {
              $cordovaDialogs.alert("Poll editing is not allowed after polling starts.", 'Edit Poll', 'Got it!').then(function() {});
            } else {
              $state.go("tab.editpost", {activityId: $scope.actionSheetActivityId});                 
            }
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


  $ionicModal.fromTemplateUrl('templates/picture-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  })  

  $scope.showActivityImage = function(activityIndex) {
    $scope.imageUrl=$scope.activities[activityIndex].get('images')[0];
    $scope.modal.show();
  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });  

  AccountService.getSelfLegisContacts(AccountService.getUserResidency()).then(function(legiContacts){
    $scope.legiContacts=legiContacts;
    for(var i=0;i<legiContacts.length;i++) {
        $scope.legiContactsList.push({
          label: legiContacts[i].get("firstName") + " " + legiContacts[i].get("lastName"),
          value: legiContacts[i].get("firstName") + " " + legiContacts[i].get("lastName"),
          opt: legiContacts[i].get("title"),
        });
      }
  },function(error){
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get legislative contacts.");
    LogService.log({type:"ERROR", message: "Unable to get legislative contacts  " + JSON.stringify(error)}); 
  })

  $scope.assignProblem = function(activityId, activityIndex) {
    $scope.activityIndex=activityIndex;
    $scope.controllerMessage=null;
    $scope.$parent.openChoiceModal("legiContacts", $scope.legiContactsList);
  }; 

  $scope.$on('choiceSelectionComplete', function(e,data) {  
      $scope.legiContactSelectedIndex=data.selected; 
      $scope.activities[$scope.activityIndex].set("assignedTo", $scope.legiContacts[$scope.legiContactSelectedIndex]);
      $scope.activities[$scope.activityIndex].set("problemStatus", "IN_PROGRESS");
      $scope.activities[$scope.activityIndex].save(null, {
        success: function(activity) {
          NotificationService.pushNotificationToUserList([$scope.activities[$scope.activityIndex].get("user").id], "Your problem has been assigned to "+$scope.legiContacts[$scope.legiContactSelectedIndex].get("firstName")+" "+$scope.legiContacts[$scope.legiContactSelectedIndex].get("lastName"));
          NotificationService.pushNotificationToUserList([$scope.legiContacts[$scope.legiContactSelectedIndex].id], "You have been assigned to a problem of "+$scope.activities[$scope.activityIndex].get("user").get("firstName")+" "+$scope.activities[$scope.activityIndex].get("user").get("lastName"));
          $scope.controllerMessage=SettingsService.getControllerInfoMessage("Assigned problem successfully.");
        },
        error: function(activity, error) {
          $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to assign the problem");
        }
      });
  });
})

.controller('ActivityCtrl', function($scope, $http, $stateParams, NotificationService, LogService, ActivityService, SettingsService) {
  $scope.appMessage=SettingsService.getAppMessage();
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


.controller('PostActivityCtrl', function($scope, $http, $state, $stateParams, $ionicHistory, NotificationService, LogService, RegionService, ActivityService, AccountService, PictureManagerService, $ionicLoading, $cordovaDialogs, $translate, SettingsService) {
  SettingsService.trackView("Post Activity controller");
  var user=AccountService.getUser();  
  var stateData=PictureManagerService.getState();
  $scope.pushNotifs={"onlyToHomeOwners":false, "onlyToMyBlock":false};
  console.log(JSON.stringify(stateData));
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());      
  $scope.blockIndex=0;
  $scope.post={
    notifyMessage: stateData.data.message!=null?stateData.data.message:"",
    activityType: stateData.data.activityType!=null?stateData.data.activityType:$stateParams.activityType,
    user: AccountService.getUser(),
    support: 0,
    oppose: 0,
    debate: 0,
    notifyHomeOwners: false,
    userToNotify:$stateParams.userId    
  };
  $scope.activitySettings={
    communityProblem: true
  };
  $scope.allowedRegions=AccountService.getRegionsAllowedToPost(user.get("role"), user.get("residency"));
  $scope.selectChoices={selectedRegion: $scope.allowedRegions[0]};  

  $scope.postErrorMessage=null;
  $scope.allowImageUpload=ionic.Platform.isWebView();
  $scope.pictureUploaded=stateData.imageUrl;

  if($scope.regionSettings.multiBlock){
    AccountService.getAllHomes(AccountService.getUserResidency()).then(function(homes){
      $scope.uniqueBlocks=[{label: "ALL"}];
      var blocks=AccountService.getUniqueBlocks(homes);
      for(var i=0; i<blocks.length; i++){
        $scope.uniqueBlocks.push({
          label: blocks[i] 
        });
      }
    },function(error){
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get blocks in community.");
    });
  }

  $scope.$on('choiceSelectionComplete', function(e,data) {  
    if(data.choiceName=="blocksType") {
      $scope.blockIndex=data.selected;  
    }
  });

  $scope.openChoiceModalOfBlocksType=function(){
     $scope.$parent.openChoiceModal("blocksType", $scope.uniqueBlocks);
  };

  displayActivityWarnMessage();
  $scope.submitPost=function() {
    SettingsService.trackEvent("Activity", "PostActivity");    
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
        $ionicLoading.show(SettingsService.getLoadingMessage("Posting activity"));
        $scope.post.regionUniqueName=$scope.selectChoices.selectedRegion.id;   
        if($scope.regionSettings.activityModeration==true) {
          $scope.post.status="P";
        } else {
          $scope.post.status="A";  
        }        
        if(PictureManagerService.getState().imageUrl!=null) {
          $scope.post.images=[PictureManagerService.getState().imageUrl];  
        }
        if($scope.post.activityType=="ISSU") {
          $scope.post.problemStatus="OPEN";
          $scope.post.problemType=$scope.activitySettings.communityProblem==true?"COMMUNITY":"PERSONAL";
        }
        if($scope.regionSettings.multiBlock){
          $scope.post.blockToNotify=$scope.uniqueBlocks[$scope.blockIndex].label;
        }
        // alert(JSON.stringify($scope.post));
        var Activity = Parse.Object.extend("Activity");
        var activity = new Activity();
        activity.save($scope.post, {
          success: function(activity) {
            // Push the new activity to the top of activity chart, probably through Activity service
            if($scope.regionSettings.activityModeration==true || ($scope.post.activityType=='ISSU' && $scope.post.communityProblem==false)) {
              // Send notification only board members
              AccountService.sendNotificationToBoard($scope.post.notifyMessage);              
              SettingsService.setAppSuccessMessage("Activity has been posted; Board will review and enable this to community.");            
            } else if($scope.post.userToNotify!=null && $scope.post.userToNotify!=""){
              AccountService.sendNotificationToResident($scope.post.notifyMessage, $scope.post.userToNotify);              
              SettingsService.setAppSuccessMessage("Message has been sent.");            
            } else if($scope.post.notifyHomeOwners || $scope.post.blockToNotify!=null) {
              // Send the push notification only to specific memebers in community
              AccountService.sendNotificationToSpecificMembers($scope.post.notifyMessage, $scope.post.notifyHomeOwners, $scope.post.blockToNotify);              
              SettingsService.setAppSuccessMessage("Activity has been posted.");            
            } else {
              // Send the push notification to everyone in community
              NotificationService.pushNotification($scope.post.regionUniqueName, $scope.post.notifyMessage);              
              SettingsService.setAppSuccessMessage("Activity has been posted.");            
            }            
            ActivityService.refreshActivityCache();
            $ionicLoading.hide();                      
            PictureManagerService.reset();
            if($scope.post.userToNotify!=null && $scope.post.userToNotify!=""){
              $ionicHistory.goBack(-1);
            } else {
              $ionicHistory.goBack(-2);
            }
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
    SettingsService.trackEvent("Activity", "CancelPostActivity");    
    if(($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10) || PictureManagerService.getState().imageUrl!=null) {
      $cordovaDialogs.confirm('Do you want to abort posting?', 'Cancel Post', ['Abort Post','Continue Edit']).then(function(buttonIndex) { 
        if(buttonIndex==1) {
          if($scope.post.userToNotify!=null && $scope.post.userToNotify!=""){
            $ionicHistory.goBack(-1);
          } else {
            $ionicHistory.goBack(-2);
          }
        } else {
          console.log("Canceled posting of activity");
        }
      });      
    } else {
        $ionicHistory.goBack(-1);
    }
  };

  $scope.goToAttachPicture=function() {
    SettingsService.trackEvent("Activity", "AttachImageToPostActivity");    
    PictureManagerService.setFromPage("tab.post");
    PictureManagerService.setData({message: $scope.post.notifyMessage});
    $state.go("tab.activity-picman");
  };

  $scope.handleActivitySelection=function() {
    displayActivityWarnMessage();
  };

  function displayActivityWarnMessage() {
    if($stateParams.activityType=="ASK") {
      $scope.postWarnMessage="Messages.PostActivityAskWarn";  
    // } else if($stateParams.activityType=="ISSU") {
    //   $scope.postWarnMessage="Messages.PostActivityIssueWarn";  
    } else {
      $scope.postWarnMessage=null;  
    }
  };

})

.controller('EditPostActivityCtrl', function($scope, $http, $state, $stateParams, NotificationService, LogService, RegionService, ActivityService, AccountService, SettingsService, $ionicHistory) {
  SettingsService.trackView("Edit Post Activity controller");
  var user=AccountService.getUser();  
  $scope.allowedActivities=ActivityService.getAllowedActivities(user);
  $scope.allowedRegions=AccountService.getRegionsAllowedToPost(user.get("role"), AccountService.getUserResidency());
  $scope.selectChoices={selectedActivityType: $scope.allowedActivities[0], selectedRegion: $scope.allowedRegions[0]};
  $scope.post={notifyMessage: ""};  

  // Retrieve post
  var Activity = Parse.Object.extend("Activity");
  var query=new Parse.Query(Activity);
  query.get($stateParams.activityId,{
    success: function(activity) {
      // if(activity.get("activityType")=="POLL") {
      //   SettingsService.setAppInfoMessage("Poll editing is not allowed after polling starts.")
      //   $ionicHistory.goBack(-1);
      // }
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
    SettingsService.trackEvent("Activity", "EditActivity");    
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
          ActivityService.refreshActivityCache();
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

})

.controller('PickActivityTypeCtrl', function($scope, $http, $state, $stateParams, NotificationService, LogService, RegionService, ActivityService, AccountService, SettingsService) {
  SettingsService.trackView("Pick activity type controller");
  $scope.activityTypeList=ActivityService.getAllowedActivities(AccountService.getUser());

  $scope.gotoActivity=function(activityType){
    SettingsService.trackEvent("Activity", "PickActivity");        
    if(activityType=="POLL") {
      $state.go("tab.post-poll-activity");
    } else {
      $state.go("tab.post", {activityType: activityType});
    }
  };

})

.controller('PostPollActivityCtrl', function($scope, $http, $state, $ionicHistory, NotificationService, LogService, RegionService, ActivityService, AccountService, PictureManagerService, $ionicLoading, $cordovaDialogs, $translate, SettingsService, $ionicModal) {
  SettingsService.trackView("Post poll activity controller");
  $scope.post={
    activityType: "POLL",
    user: AccountService.getUser(),
    regionUniqueName: AccountService.getUserResidency(),
    notifyMessage: "",
    endDate: new Date().addDays(7).endOfTheDay(),
    choices: [],
    votes: [],
    pollSettings: {whoCanVote: "ALL"},
    debate: 0
  };
  for(var i=0;i<2;i++) {
    $scope.post.choices.push(null);
  }      
  console.log("Choices " + JSON.stringify($scope.post.choices));
  $scope.regionSettings=RegionService.getRegionSettings(Parse.User.current().get("residency"));  

  $scope.whoCanVoteChoices=[
    {label: "Everyone", value: "Everyone"}, 
    {label: "Only Home Owners", value: "Only Home Owners"}
  ];
  $scope.whoCanVoteSelectedIndex=0; 

  $scope.addChoice=function() {
    var haveUsedDefaultChoices=true;
    for(var i=0;i<$scope.post.choices.length;i++) {
      if($scope.post.choices[i]==null || $scope.post.choices[i].trim().length<1) {
        haveUsedDefaultChoices=false;
        break;
      }
    }    
    if(haveUsedDefaultChoices==true) {
      $scope.post.choices.push(null);
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter first two choices to add additional choices.");
    }
  };

  $scope.submitPoll=function() {
    SettingsService.trackEvent("Activity", "SubmitPollActivity");        
    if($scope.post.notifyMessage==null || $scope.post.notifyMessage.length<10 || $scope.post.notifyMessage.length>2048) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Poll question should be minimum 10 characters.");
      return;
    }      

    if($scope.post.endDate.getTime()<new Date().getTime()) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please select poll end date in the future.");
      return;
    }      

    for(var i=0;i<$scope.post.choices.length;i++) {
      if($scope.post.choices[i]!=null && $scope.post.choices[i].trim().length<0) {
        $scope.post.choices.splice(i, 1);
      }
    }

    if($scope.post.choices.length<2) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please enter minimum two poll choices.");
      return;      
    } 

    var badwords=ActivityService.getBadWordsFromMesage($scope.post.notifyMessage);
    if(badwords!=null && badwords.length>0) {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please remove bad words " + JSON.stringify(badwords) + " from the question.");
      return;
    }

    $scope.post.notifyMessage = ActivityService.toProperPost($scope.post.notifyMessage);
    $cordovaDialogs.confirm('Do you want to submit this poll?', 'Submit Poll', ['Submit','Continue Edit']).then(function(buttonIndex) { 
      if(buttonIndex==1) {       
        $ionicLoading.show(SettingsService.getLoadingMessage("Submitting your poll"));
        if($scope.regionSettings.activityModeration==true) {
          $scope.post.status="P";
        } else {
          $scope.post.status="A";  
        }        

        for(var i=0;i<$scope.post.choices.length;i++) {
          $scope.post.votes.push(0);
        }

        if($scope.whoCanVoteSelectedIndex==1) {
          $scope.post.pollSettings.whoCanVote="HOME_OWNER";
        }

        // alert(JSON.stringify($scope.post));    
        // $ionicLoading.hide();
        // return;
        var Activity = Parse.Object.extend("Activity");
        var activity = new Activity();
        activity.save($scope.post, {
          success: function(activity) {
            // Push the new activity to the top of activity chart, probably through Activity service
            if($scope.regionSettings.activityModeration==true) {
              // Send notification only board members
              AccountService.sendNotificationToBoard($scope.post.notifyMessage);              
              SettingsService.setAppSuccessMessage("Poll has been submitted; Board will review and enable this to community."); 
            } else {
              // Send the push notification to everyone in community
              NotificationService.pushNotification($scope.post.regionUniqueName, $scope.post.notifyMessage);              
              SettingsService.setAppSuccessMessage("Poll has been submitted.");            
            }            
            ActivityService.refreshActivityCache();
            $ionicLoading.hide();                      
            $ionicHistory.goBack(-2);
          },
          error: function(activity, error) {
            console.log("Error in submitting poll " + JSON.stringify(error));
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to submit the poll. " + error.message);
            $ionicLoading.hide();                      
          }
        });
      } else {
        console.log("Canceled submitting of poll");
      }
    });

  };  

  $scope.$on('choiceSelectionComplete', function(e,data) {  
    if(data.choiceName=="whoCanVote") {
      $scope.whoCanVoteSelectedIndex=data.selected;  
    }    
  });

  $scope.openChoiceModalOfWhoCanVote=function() {
    $scope.$parent.openChoiceModal("whoCanVote", $scope.whoCanVoteChoices);
  };

  $scope.cancelSubmit=function(){
    if($scope.post.notifyMessage!=null && $scope.post.notifyMessage.length>10) {
      $cordovaDialogs.confirm('Do you want to cancel submitting the poll?', 'Cancel Post', ['Abort Post','Continue Edit']).then(function(buttonIndex) { 
        if(buttonIndex==1) {
          $ionicHistory.goBack(-2);
        } else {
          console.log("Canceled posting of activity");
        }
      });      
    } else {
      $ionicHistory.goBack(-1);
    }
  };

})

.controller('ViewPollActivityCtrl', function($scope, $stateParams, $http, $state, NotificationService, LogService, RegionService, ActivityService, AccountService, PictureManagerService, $ionicLoading, $cordovaDialogs, $translate, SettingsService, $ionicHistory) {
  SettingsService.trackView("Post poll activity controller " + $stateParams.activityId);  
  $scope.input={
    vote: [],
    pollingClosed: false
  };
  $scope.regionSettings=RegionService.getRegionSettings(AccountService.getUserResidency());
  var pageTransitionData=SettingsService.getPageTransitionData();
  if(pageTransitionData!=null) {
    $scope.activity=pageTransitionData.activity;
    $scope.userActions=pageTransitionData.userActions;
    // Is poll expired?
    if($scope.activity.get("endDate").getTime()<new Date().getTime()) {
      $scope.input.pollingClosed=true;
      $scope.currentVotes=$scope.activity.get("votes");
      $scope.winningIndex=0;
      for(var i=0;i<$scope.currentVotes.length-1;i++) {
        if($scope.currentVotes[i+1]>$scope.currentVotes[i]) {
          $scope.winningIndex=i+1;
        }
      }      
    } else {
      // Not expired; Has this user voted on this before?
      for(var i=0;i<$scope.activity.get("choices").length;i++) {
        $scope.input.vote.push(false);      
      }
      $ionicLoading.show(SettingsService.getLoadingMessage("Checking voting preferences"));      
      $scope.isPollSubmitted=false;        
      ActivityService.isHomePerformedActivity($scope.activity).then(function(userActivityList){
        if(userActivityList!=null && userActivityList.length>0) {
          $scope.isPollSubmitted=true;
          $scope.input.vote[userActivityList[0].get("votedIndex")]=true;
          $scope.controllerMessage=SettingsService.getControllerInfoMessage("We have received voting from your home. Thanks for your response!");
        }        
        $ionicLoading.hide();
      },function(error){
        console.log("Error while finding poll activity status : " + JSON.stringify(error));        
        $ionicLoading.hide();
      });
    }
  } else {
    $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to get poll details to take your input.");
  }

  $scope.handleCheckBoxSelection=function(changedIndex) {
    // TODO :: If poll allows multiple selections, skip this radion button imitation
    for(var i=0;i<$scope.input.vote.length;i++) {
      if(i!=changedIndex && $scope.input.vote[i]==true) {
        $scope.input.vote[i]=false;
      }
    }
  };

  $scope.submitPollResponse=function() {
    var votedIndex=-1;
    for(var i=0;i<$scope.input.vote.length;i++) {
      if($scope.input.vote[i]==true) {
        votedIndex=i;
        break;
      }
    }    
    if(votedIndex!=-1) {
      $cordovaDialogs.confirm('Do you want to submit your vote?', 'Submit Vote', ['Submit Vote','Let me think']).then(function(buttonIndex) { 
        if(buttonIndex==1) {       
          $ionicLoading.show(SettingsService.getLoadingMessage("Submitting your vote"));      
          ActivityService.respondToPoll($scope.activity.id, votedIndex).then(function(updatedActivity){
            SettingsService.setAppSuccessMessage("Submitted your response for the poll.");
            $ionicLoading.hide();
            $state.go("tab.dash");
          },function(error){
            $scope.controllerMessage=SettingsService.getControllerErrorMessage("Unable to accept your vote.");  
            $ionicLoading.hide();
          });
        } else {
          console.log("Canceled submitting of poll");
        }
      });
    } else {
      $scope.controllerMessage=SettingsService.getControllerErrorMessage("Please select your choice.");
    }
  };  

  $scope.respondLater=function(){
    $ionicHistory.goBack(-1);
  };

})

;
