// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova'])

.run(function($rootScope, $ionicPlatform, $cordovaPush) {
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

    var androidConfig = {
      "senderID": "927589908829",
    };

    $cordovaPush.register(androidConfig).then(function(result) {
      alert("Register Success : " + result);
      console.log("Register Success : " + result);
      // Success
    }, function(err) {
      // Error
      alert("Register error : " + err);
      console.log("Register error : " + err);
    });

    $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
      switch(notification.event) {
        case 'registered':
          if (notification.regid.length > 0 ) {
            alert('registration ID = ' + notification.regid);
            console.log('registration ID = ' + notification.regid);
          }
          break;

        case 'message':
          // this is the actual push notification. its format depends on the data model from the push server
          alert('message = ' + notification.message + ' msgCount = ' + notification.msgcnt);
          console.log('message = ' + notification.message + ' msgCount = ' + notification.msgcnt);
          break;

        case 'error':
          alert('GCM error = ' + notification.msg);
          console.log('GCM error = ' + notification.msg);
          break;

        default:
          alert('An unknown GCM event has occurred');
          console.log('An unknown GCM event has occurred');
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

    .state('tab.region', {
      url: '/region/{regionUniqueName}',
      views: {
        'tab-region': {
          templateUrl: 'templates/region-detail.html',
          controller: 'RegionDetailCtrl'
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
      views: {
        "tab-account": {
          templateUrl: 'templates/tab-account.html',
          controller: 'AccountCtrl'        
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
