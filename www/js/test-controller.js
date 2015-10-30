angular.module('starter.controllers')

.controller('TestCtrl', function($scope, $ionicPopover, $ionicActionSheet, $timeout, NotificationService) {
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

    var users=["PM0VE24LmA", "Q797sqw1Md"];


    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("notifySetting", true);
    userQuery.containedIn("objectId", users);

    var Debate = Parse.Object.extend("Debate");
    var query = new Parse.Query(Debate);
    query.matchesQuery("user", userQuery);

    // var users=["PM0VE24LmA", "Q797sqw1Md"];
    // var userPointers=[];
    // for(var i=0;i<users.length;i++) {
    //   var userPointer={
    //     __type: "Pointer",
    //     className: "_User",
    //     objectId: users[i]
    //   };
    //   userPointers.push(userPointer);
    // }
    // query.containedIn('user', userPointers);

    query.find({
      success: function(results) {
        //alert("Response : " + JSON.stringify(results));
        alert("Response count : " + results.length);
      },
      error: function(error) {
        alert("Error : " + JSON.stringify(error));
      }
    })

    //var notifyUsers=["XdDgeUqpyY"]; 
    var notifyUsers=["PM0VE24LmA","Q797sqw1Md","RWOHlrbepU"];
    NotificationService.pushNotificationToUserList(notifyUsers, "Testing comment notifications");


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

    $scope.getComplexChartData=function() {
      var lineItems=[
        {name: "A", amount:12.00},
        {name: "B", amount:10.00},
        {name: "C", amount:14.00},
        {name: "D", amount:11.00},
        {name: "E", amount:16.00},
        {name: "F", amount:17.00},
        {name: "G", amount:18.00},
        {name: "H", amount:19.00}
      ];

      // var lineItems=[
      //   {name: "A", amount:12.00},
      //   {name: "B", amount:10.00},
      //   {name: "C", amount:14.00},
      //   {name: "D", amount:11.00}
      // ];


    var chartData=[
      {color:"#F7464A",highlight: "#FF5A5E"},
      {color:"#46BFBD",highlight: "#5AD3D1"},
      {color:"#FDB45C",highlight: "#FFC870"},
      {color:"#949FB1",highlight: "#A8B3C5"},
      {color:"#4D5360",highlight: "#616774"},
      {color:"#4BC459",highlight: "#38E04C"}
    ];
    var misc={value: 0.00, label: "Misc"};
    // Filter category items and make a copy not to impact showing of original list
    var sortedLineItems=[];
    for(var i=0;i<lineItems.length;i++) {
      if(lineItems[i].amount!="CATEGORY") {
        sortedLineItems.push(lineItems[i]);
      }
    }
    // Sort the array
    sortedLineItems.sort(function(a, b) {
      return parseFloat(b.amount) - parseFloat(a.amount);
    });
    // Populate chart data based on sorted array 
    for(var i=0;i<chartData.length;i++) {
      if(i<sortedLineItems.length && i<chartData.length-1) {
        chartData[i].value=sortedLineItems[i].amount;
        chartData[i].label=sortedLineItems[i].name;        
      } else if(i<sortedLineItems.length && i==chartData.length-1){
        // Preopare misc item
        var miscAmount=0.00;
        for(var j=i;j<sortedLineItems.length;j++) {
          miscAmount=miscAmount+sortedLineItems[j].amount;
        }
        chartData[i].value=miscAmount;
        chartData[i].label="Misc";        
      } 
    }
    var finalChartData=[];
    for(var i=0;i<chartData.length;i++) {
      if(chartData[i].value!=null) {
        finalChartData.push(chartData[i]);
      }
    }
    console.log(JSON.stringify(finalChartData));

    var ctx = document.getElementById("expChart").getContext("2d");
    var myNewChart = new Chart(ctx).Pie(finalChartData);
    $scope.legend=myNewChart.generateLegend();
    console.log($scope.legend);

  };

});
