// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.test-controller', 'starter.controllers', 'starter.services', 'ngCordova'])

.run(function($rootScope, $ionicPlatform, $cordovaPush, NotificationService, LogService) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
      switch(notification.event) {
        case 'registered':
          if (notification.regid.length > 0 ) {
            console.log('registration ID = ' + notification.regid);
            var user=Parse.User.current();
            NotificationService.addAndroidInstallation(user.id, notification.regid, [user.get("residency")], function(result){
                  console.log("Success response : " + JSON.stringify(result.data));
                  LogService.log({type:"INFO", message: "Registered device" + JSON.stringify(result.data)});              
                }, function(error) {
                  console.log("Error response : " + JSON.stringify(error));
                  LogService.log({type:"ERROR", message: "Failed to registered device" + JSON.stringify(error)});                        
              });            
          }
          break;

        case 'message':
          // this is the actual push notification. its format depends on the data model from the push server
          navigator.notification.alert(notification.payload.data.alert);          
          navigator.notification.beep(1);
          console.log('message = ' + notification.payload.data.alert);          
          LogService.log({type:"INFO", message: "Received push notification " + JSON.stringify(notification)});           
          break;

        case 'error':
          navigator.notification.alert(JSON.stringify(notification));                  
          console.log('GCM error = ' + JSON.stringify(notification));
          LogService.log({type:"ERROR", message: "Error notification from GCM " + JSON.stringify(notification)}); 
          break;

        default:
          navigator.notification.alert(JSON.stringify(notification));                          
          console.log('An unknown GCM event has occurred ' + JSON.stringify(notification));
          LogService.log({type:"ERROR", message: "Unknown notification from GCM " + JSON.stringify(notification)}); 
          break;
      }
    });

  });
})
.config(function($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider
    // setup an abstract state for the tabs directive
    .state('tab', {
      url: "/tab",
      abstract: true,
      templateUrl: "templates/tabs.html",
      onEnter: function($state) {
        var user=Parse.User.current();
        if(user==null || !user.authenticated()) {
          console.log("User is not authenticated");
          $state.go("register");
        }
      }
    })
    // Each tab has its own nav history stack:
    .state('tab.dash', {
      url: '/dash',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/tab-dash.html',
          controller: 'DashboardCtrl'
        }
      }
    })

    .state('tab.activity', {
      url: '/activity/{activityId}',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity-detail.html',
          controller: 'ActivityCtrl'
        }
      }
    })

    .state('tab.post', {
      url: '/post',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/post-activity.html',
          controller: 'PostActivityCtrl'
        }
      }
    })

    .state('tab.regions', {
      url: '/regions',
      views: {
        'tab-region': {
          templateUrl: 'templates/region-list.html',
          controller: 'RegionListCtrl'
        }
      }
    })

    .state('tab.test', {
      url: '/test',
      views: {
        'tab-region': {
          templateUrl: 'templates/test-template.html',
          controller: 'TestCtrl'
        }
      }
    })

    .state('tab.region', {
      url: '/region/{regionUniqueName}',
      views: {
        'tab-region': {
          templateUrl: 'templates/region-detail.html',
          controller: 'RegionDetailCtrl'
        }
      }
    })

    .state('tab.demo', {
      url: '/demo/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region-demo.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })

    .state('tab.changedemodetails', {
      url: '/changedemodetails',
        views: {
          'tab-region': {
            templateUrl: 'templates/new-demo-details.html',
            controller: 'ChangeDemoDetailsCtrl'
          }
        }
    })

    .state('tab.offices', {
      url: '/offices/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region-offices.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })
    .state('tab.legis', {
      url: '/legis/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region-legislature.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })    
    .state('tab.finview', {
      url: '/finview/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region-fin-overview.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })  
    // .state('tab.account.settings', {
    //   url: '/settings',
    //   views: {
    //     "tab-account@tab": {
    //       templateUrl: 'templates/account-detail.html',
    //       controller: 'AccountDetailCtrl'              
    //     }
    //   }
    // })
    .state('tab.account', {
      url: '/account',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/tab-account.html',
          controller: 'AccountCtrl'        
        }
      }
    })
    .state('tab.adminaccess', {
      url: '/adminaccess',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/admin-access-request.html',
          controller: 'AdminAccessReqCtrl'        
        }
      }
    })

    .state('tab.adminAccessList', {
      url: '/adminAccessList',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/admin-access-request-list.html',
          controller: 'AdminAccessReqListCtrl'        
        }
      }
    })

    .state('tab.adminAccessReqHandle', {
      url: '/adminAccessReqHandle/{accessRequestId}',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/admin-access-request-detail.html',
          controller: 'AdminAccessReqDetailCtrl'        
        }
      }
    })    

    .state('register', {
      url: '/register',
      templateUrl: 'templates/register.html',
      controller: 'RegisterCtrl',
      cache: false
    });

    $urlRouterProvider.otherwise('/tab/dash');

});
