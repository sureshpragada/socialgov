angular.module('starter.controllers')

.controller('TestCtrl', function($scope, $ionicPopover, $ionicActionSheet, $timeout) {
  /////////////////// Test 1 : Working with select boxes
  $scope.colors = [
      {name:'black', shade:'dark'},
      {name:'white', shade:'light', notAnOption: true},
      {name:'red', shade:'dark'},
      {name:'blue', shade:'dark', notAnOption: true},
      {name:'yellow', shade:'light', notAnOption: false}
    ];
    // $scope.post={myColor:$scope.colors[2]};
    $scope.post={myColor:null};    
    // $scope.myColor = $scope.colors[2]; // red
    $scope.testColor=function() {
      alert(JSON.stringify($scope.post.myColor));
    };


  var template = '<ion-popover-view><ion-header-bar> <h1 class="title">My Popover Title</h1> </ion-header-bar> <ion-content> Hello! </ion-content></ion-popover-view>';

  $ionicPopover.fromTemplateUrl('templates/popover.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.openPopover = function($event, option) {
    $scope.popover.show($event);
    $scope.optionId=option;
  };

  $scope.editThis=function() {
    $scope.popover.hide();
    alert("being edited " + $scope.optionId);
  }

  $scope.removeThis=function() {
    $scope.popover.hide();
    alert("being removed " + $scope.optionId);
  }

  $scope.openActionSheet=function(userType) {

var hideSheet = $ionicActionSheet.show({
     buttons: [
       { text: '<b>Share</b> This' },
       { text: 'Move' }
     ],
     destructiveText: 'Delete',
     titleText: 'Modify your album',
     cancelText: 'Cancel',
     cancel: function() {
          // add cancel code..
        },
     buttonClicked: function(index) {
       return true;
     }
   });

  $timeout(function() {
       hideSheet();
     }, 2000);


  }


  $scope.testActivityPushNotification=function() {
    var activityId="WT9t96kS4X";
    alert(activityId);
  };
  ////////////////// Test 2 : Create object and retrieve

  // var Activity = Parse.Object.extend("Activity");
  // var activity=new Activity();
  // activity.id="dw7I1G2fuC";

  // var TestData = Parse.Object.extend("TestData");
  // var query = new Parse.Query(TestData);
  // query.equalTo("action", "support");
  // query.include("user");
  // query.descending("createdAt");
  // query.find({
  //   success: function(debates) {
  //     $scope.$apply(function(){
  //       if(debates!=null && debates.length>0) {
  //         console.log("Deabte notes : " + JSON.stringify(debates));
  //         $scope.debateList=debates;
  //       } else {
  //         console.log("No arguments found for activity ");
  //         $scope.debateList=[];
  //       }
  //     });
  //   },
  //   error: function(activity, error) {
  //     console.log("Error retrieving arguments of a debate " + error.message);
  //   }
  // });         

  // $scope.createEntry=function() {

  //   var Activity = Parse.Object.extend("Activity");
  //   var activityContent=new Activity();
  //   activityContent.id="dw7I1G2fuC";

  //  var testContent={action:"support", user: Parse.User.current(), activity:activityContent};

  //   var TestData = Parse.Object.extend("TestData");
  //   var testData = new TestData();
    
  //   testData.save(testContent, {
  //     success: function(content) {
  //       alert("Successfully created " + JSON.stringify(content));
  //     },
  //     error: function(content, error) {
  //       console.log("Error creating entry " + error.message);
  //     }
  //   });          

  // };

});
