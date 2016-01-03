// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.directives', 'settings.services', 'account.services', 'activity.services', 'starter.services', 'starter.filters', 'ngCordova', 'ngSanitize', 'angular-cache','pascalprecht.translate', 'ngIOS9UIWebViewPatch', 'ngGentle'])
.run(function($rootScope, $ionicPlatform, $cordovaPush, NotificationService, LogService, RegionService, AccountService) {
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
      controller: 'TabsCtrl',
      onEnter: function($state) {
        var user=Parse.User.current();
        if(user==null || !user.authenticated()) {
          console.log("User is not authenticated");
          $state.go("invite-login");
        }
      }
    })
    // Each tab has its own nav history stack:
    .state('tab.dash', {
      url: '/dash',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/tab-dash.html',
          controller: 'DashboardCtrl'
        }
      }
    })

    .state('tab.activity', {
      url: '/activity/{activityId}',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/activity-detail.html',
          controller: 'ActivityCtrl'
        }
      }
    })

    .state('tab.post', {
      url: '/post',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/post-activity.html',
          controller: 'PostActivityCtrl'
        }
      }
    })

    .state('tab.editpost', {
      url: '/editpost/{activityId}',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/edit-post-activity.html',
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
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/change-demo-details.html',
          controller: 'ChangeDemoDetailsCtrl'
        }
      }
    })

    .state('tab.offices', {
      url: '/offices/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-offices.html',
          controller: 'RegionOfficeDetailCtrl'
        }
      }
    })

    .state('tab.editoffices', {
      url: '/editoffices/{regionUniqueName}/{officeIndex}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/edit-office-details.html',
          controller: 'EditOfficeDetailsCtrl'
        }
      }
    })

    .state('tab.addoffices', {
      url: '/addoffices/{regionUniqueName}',
      cache: false,
      views: {
        'tab-region': {
          templateUrl: 'templates/region/add-new-office.html',
          controller: 'AddOfficeCtrl'
        }
      }
    })

    .state('tab.service', {
      url: '/service/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-service-contacts.html',
          controller: 'RegionServiceContactsCtrl'
        }
      }
    })

    .state('tab.add-service-contact', {
      url: '/add-service-contact/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/add-service-contact.html',
          controller: 'AddServiceContactsCtrl'
        }
      }
    })    

    .state('tab.legis', {
      url: '/legis/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-legislature.html',
          controller: 'RegionLegisDetailCtrl'
        }
      }
    })

    .state('tab.addlegis', {
      url: '/addlegis/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/add-new-legislative.html',
          controller: 'AddLegisCtrl'
        }
      }
    })

    .state('tab.editlegis', {
      url: '/editlegis/{regionUniqueName}/{legisIndex}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/edit-legis-details.html',
          controller: 'EditLegisDetailsCtrl'
        }
      }
    })

    .state('tab.finview', {
      url: '/finview/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-fin-overview.html',
          controller: 'RegionFinancialOverviewCtrl'
        }
      }
    })

    .state('tab.addfinview', {
      url: '/addfinview/{regionUniqueName}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/add-region-fin-overview.html',
            controller: 'AddRegionFinancialOverviewCtrl'
          }
        }
    })

    .state('tab.editfinancial', {
      url: '/editfinancial/{id}',
        views: {
          'tab-region': {
            templateUrl: 'templates/region/edit-region-fin-overview.html',
            controller: 'EditRegionFinancialOverviewCtrl'
          }
        }
    })

    .state('tab.findet', {
      url: '/findet/{regionUniqueName}/{year}/{reqDetails}',
      cache: false,            
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
          templateUrl: 'templates/account/tab-account.html',
          controller: 'AccountCtrl'        
        }
      }
    })

    .state('tab.account-update', {
      url: '/account-update',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/account/account-update.html',
          controller: 'AccountUpdateCtrl'        
        }
      }
    })

    .state('tab.invite-citizen', {
      url: '/invite-citizen',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/account/invite-citizen.html',
          controller: 'InviteCitizenCtrl'        
        }
      }
    })

    .state('tab.adminaccess', {
      url: '/adminaccess',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/account/admin-access-request.html',
          controller: 'AdminAccessReqCtrl'        
        }
      }
    })

    .state('tab.adminAccessList', {
      url: '/adminAccessList',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/account/admin-access-request-list.html',
          controller: 'AdminAccessReqListCtrl'        
        }
      }
    })

    .state('tab.adminAccessReqHandle', {
      url: '/adminAccessReqHandle/{accessRequestId}',
      cache: false,
      views: {
        "tab-account": {
          templateUrl: 'templates/account/admin-access-request-detail.html',
          controller: 'AdminAccessReqDetailCtrl'        
        }
      }
    })    

    .state('invite-login', {
      url: '/invite-login',
      templateUrl: 'templates/account/invite-login.html',
      controller: 'InvitationLoginCtrl',
      cache: false
    })

    .state('register', {
      url: '/register',
      templateUrl: 'templates/account/register.html',
      controller: 'RegisterCtrl',
      cache: false
    });

    $urlRouterProvider.otherwise('/tab/dash');

})

.config(function ($translateProvider) {
  $translateProvider.translations('sg-en', {
    FName: 'First Name',
    LName: 'Last Name',
    PhNum: 'Phone Number',
    Resdncy: 'Residency',
    Role:'Role',
    Notify:'Notifications',   
    SecondLevelRegion: 'Mandal/City',
    FirstLevelRegion: 'Village/Division',
    Population: 'Population',
    PostalCode: 'PIN Codes',
    Currency: 'Rs',
    Messages: {
      PostActivityAskWarn: 'Answers provided here are personal views and do not reflect views of Government.',
      PostActivityIssueWarn: 'Please report village level problems. Do not use this forum for personal problems.'
    }
  });
  $translateProvider.translations('ob-en', {
    FName: 'First Name',
    LName: 'Last Name',
    PhNum: 'Phone Number',
    Resdncy: 'Residency',
    Role:'Role',
    Notify:'Notifications',
    SecondLevelRegion: 'Master Association',
    FirstLevelRegion: 'Association',
    Population: 'Homes',
    PostalCode: 'ZIP Codes',
    Currency: '$',
    Messages: {
      PostActivityAskWarn: 'Answers provided here are personal views and do not reflect views of the association board.',
      PostActivityIssueWarn: 'Report community level problems here. Reach out to management company for any home specific issues.'      
    }
  });  

  $translateProvider.translations('sg-te', {
    FName: 'పేరు',
    LName: 'ఇంటి పేరు',
    PhNum: 'ఫొన్ నంబర్',
    Resdncy: 'ఊరు',
    Role:'అధికారి/పౌరులు',
    Notify:'ప్రకటనలు'
  });
  $translateProvider.preferredLanguage(LANG_PREF);
});;
