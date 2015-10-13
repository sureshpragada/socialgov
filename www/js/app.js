// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'starter.filters', 'ngCordova', 'ngSanitize', 'angular-cache'])

.run(function($rootScope, $ionicPlatform, $cordovaPush, NotificationService, LogService, RegionService) {
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

    RegionService.initializeRegionCacheByCurrentUser();

    $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
      if(ionic.Platform.isAndroid()) {
        switch(notification.event) {
          case 'registered':
            if (notification.regid.length > 0 ) {
              LogService.log({type:"INFO", message: "Android registration is success : " + notification.regid + " for user : " + Parse.User.current().id});                           
              NotificationService.addAndroidInstallation(Parse.User.current().id, notification.regid, RegionService.getRegionHierarchy());            
            }
            break;

          case 'message':
            // this is the actual push notification. its format depends on the data model from the push server
            navigator.notification.alert(notification.payload.data.alert);          
            navigator.notification.beep(1);
            LogService.log({type:"INFO", message: "Received push notification " + JSON.stringify(notification)});           
            break;

          case 'error':
            navigator.notification.alert(JSON.stringify(notification));                  
            LogService.log({type:"ERROR", message: "Error notification from GCM " + JSON.stringify(notification)}); 
            break;

          default:
            navigator.notification.alert(JSON.stringify(notification));                          
            LogService.log({type:"ERROR", message: "Unknown notification from GCM " + JSON.stringify(notification)}); 
            break;
        }        
      } else if(ionic.Platform.isIOS()) {
        if (notification.alert) {
          navigator.notification.alert(notification.alert);
        }

        if (notification.sound) {
          var snd = new Media(event.sound);
          snd.play();
        }

        if (notification.badge) {
          $cordovaPush.setBadgeNumber(notification.badge).then(function(result) {
            console.log("Badge push is succcessful");
          }, function(err) {
            console.log("Badge push is failed " + JSON.stringify(err));
          });
        }
      } else {
        LogService.log({type:"ERROR", message: "Received notification from unknown platform " + JSON.stringify(ionic.Platform.device()) + " notification : " + JSON.stringify(notification)}); 
      }
    });

  });
})
.config(function($compileProvider){
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(http|https|ftp|mailto|file|tel|data)/);
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

    .state('tab.editpost', {
      url: '/editpost/{activityId}',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/edit-post-activity.html',
          controller: 'EditPostActivityCtrl'
        }
      }
    })

    .state('tab.picman', {
      url: '/picman',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/picture-manager.html',
          controller: 'PictureManagerCtrl'
        }
      }
    })    

    .state('tab.regions', {
      url: '/regions',
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-list.html',
          controller: 'RegionListCtrl'
        }
      }
    })

    .state('tab.test', {
      url: '/test',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/test-template.html',
          controller: 'TestCtrl'
        }
      }
    })

    .state('tab.region', {
      url: '/region/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-detail.html',
          controller: 'RegionDetailCtrl'
        }
      }
    })

    .state('tab.demo', {
      url: '/demo/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-demo.html',
          controller: 'RegionDetailCtrl'
        }
      }
    })

    .state('tab.changedemodetails', {
      url: '/changedemodetails/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/change-demo-details.html',
            controller: 'ChangeDemoDetailsCtrl'
          }
        }
    })

    .state('tab.offices', {
      url: '/offices/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/region-offices.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })

    .state('tab.editoffices', {
      url: '/editoffices/{regionUniqueName}/{uniqueOfficeName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/edit-office-details.html',
            controller: 'EditOfficeDetailsCtrl'
          }
        }
    })

    .state('tab.addoffices', {
      url: '/addoffices/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/add-new-office.html',
            controller: 'AddOfficeCtrl'
          }
        }
    })

    .state('tab.legis', {
      url: '/legis/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/region-legislature.html',
            controller: 'RegionDetailCtrl'
          }
        }
    })    
    .state('tab.finview', {
      url: '/finview/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/region-fin-overview.html',
            controller: 'RegionFinancialOverviewCtrl'
          }
        }
    })  
    .state('tab.findet', {
      url: '/findet/{regionUniqueName}/{year}/{reqDetails}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/region-fin-details.html',
            controller: 'RegionFinancialDetailsCtrl'
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
