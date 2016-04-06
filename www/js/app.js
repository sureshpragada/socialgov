// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.directives', 'settings.services', 'account.services', 'financial.services', 'activity.services', 'region.services', 'region-financial.services', 'notification.services', 'log.services', 'starter.filters', 'ngCordova', 'ngSanitize', 'angular-cache','pascalprecht.translate', 'ngIOS9UIWebViewPatch', 'ngGentle'])
.run(function($rootScope, $ionicPlatform, $cordovaPush, NotificationService, LogService, RegionService, AccountService, $state, $ionicHistory) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);      
      cordova.plugins.Keyboard.disableScroll(true);      
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    RegionService.initializeRegionCacheByCurrentUser();

    $ionicPlatform.registerBackButtonAction(function (event) {
      if($state.current.name=="tab.dash" || $state.current.name=="tab.region" || $state.current.name=="tab.financial" || $state.current.name=="tab.account" ){
        ionic.Platform.exitApp();
      } else {
        $ionicHistory.goBack(-1);
        // navigator.app.backHistory();
      }
    }, 100);    

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
          $state.go("home");
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

    .state('tab.pick-activity-type', {
      url: '/pick-activity-type',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/pick-activity-type.html',
          controller: 'PickActivityTypeCtrl'
        }
      }
    })

    .state('tab.post-poll-activity', {
      url: '/post-poll-activity',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/post-poll-activity.html',
          controller: 'PostPollActivityCtrl'
        }
      }
    })

    .state('tab.view-poll-activity', {
      url: '/view-poll-activity/{activityId}',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/activity/view-poll-activity.html',
          controller: 'ViewPollActivityCtrl'
        }
      }
    })    

    .state('tab.post', {
      url: '/post/{activityType}',
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

    .state('tab.activity-picman', {
      url: '/activity-picman',
      cache: false,
      views: {
        'tab-dash': {
          templateUrl: 'templates/picture-manager.html',
          controller: 'PictureManagerCtrl'
        }
      }
    })    

    .state('tab.account-picman', {
      url: '/account-picman',
      cache: false,
      views: {
        'tab-account': {
          templateUrl: 'templates/picture-manager.html',
          controller: 'PictureManagerCtrl'
        }
      }
    })        

    .state('tab.financial-picman', {
      url: '/financial-picman',
      cache: false,
      views: {
        'tab-financial': {
          templateUrl: 'templates/picture-manager.html',
          controller: 'PictureManagerCtrl'
        }
      }
    })        

    .state('tab.community-picman', {
      url: '/community-picman',
      cache: false,
      views: {
        'tab-region': {
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

    .state('tab.community-rules', {
      url: '/community-rules',
      cache: false,
      views: {
        "tab-region": {
          templateUrl: 'templates/region/community-rules.html',
          controller: 'CommunityRulesCtrl'        
        }
      }
    })

    .state('tab.update-community-rules', {
      url: '/update-community-rules',
      cache: false,
      views: {
        "tab-region": {
          templateUrl: 'templates/region/update-community-rules.html',
          controller: 'UpdateCommunityRulesCtrl'        
        }
      }
    })        

    .state('tab.region-settings', {
      url: '/region-settings/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-settings.html',
          controller: 'RegionSettingsCtrl'
        }
      }
    })

    .state('tab.region-settings-function', {
      url: '/region-settings-function/{regionUniqueName}/{functionName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-settings-function.html',
          controller: 'RegionSettingsFunctionCtrl'
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

    .state('tab.addcontacttooffice', {
      url: '/addcontacttooffice/{regionUniqueName}/{officeIndex}',
      cache: false,
      views: {
        'tab-region': {
          templateUrl: 'templates/region/add-contact-to-office.html',
          controller: 'AddContactToOfficeCtrl'
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

    .state('tab.service-contact-detail', {
      url: '/service-contact-detail/{serviceContactId}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-service-contact-detail.html',
          controller: 'RegionServiceContactDetailCtrl'
        }
      }
    })

    .state('tab.edit-service-contact', {
      url: '/edit-service-contact/{serviceContactId}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-edit-service-contacts.html',
          controller: 'RegionEditServiceContactsCtrl'
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

    .state('tab.board-appointment', {
      url: '/board-appointment',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/board-appointment.html',
          controller: 'BoardAppointmentCtrl'
        }
      }
    })

    .state('tab.manage-legislative-titles', {
      url: '/manage-legislative-titles',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/manage-legislative-titles.html',
          controller: 'ManageLegislativeTitlesCtrl'
        }
      }
    })

    .state('tab.selflegis', {
      url: '/selflegis/{regionUniqueName}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-self-legislature.html',
          controller: 'SelfLegisDetailCtrl'
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

    .state('tab.homes', {
      url: '/homes',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-homes.html',
          controller: 'RegionHomesCtrl'
        }
      }
    })             

    .state('tab.add-homes', {
      url: '/add-homes',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/add-homes.html',
          controller: 'AddHomesCtrl'
        }
      }
    })             

    .state('tab.home-detail', {
      url: '/home-detail/{homeNo}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/home-detail.html',
          controller: 'HomeDetailCtrl'
        }
      }
    })             

    .state('tab.neighbors', {
      url: '/neighbors',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-neighbors.html',
          controller: 'NeighborListCtrl'
        }
      }
    })             

    .state('tab.neighbor-detail', {
      url: '/neighbor-detail/{userId}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/region-neighbor-detail.html',
          controller: 'NeighborDetailCtrl'
        }
      }
    })                 

    .state('tab.admin-neighbor-update', {
      url: '/admin-neighbor-update/{userId}',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/admin-neighbor-update.html',
          controller: 'AdminNeighborUpdateCtrl'
        }
      }
    })                     

    .state('tab.upload-neighbors', {
      url: '/upload-neighbors',
      cache: false,      
      views: {
        'tab-region': {
          templateUrl: 'templates/region/upload-neighbors.html',
          controller: 'UploadNeighborsCtrl'
        }
      }
    })                 

    .state('tab.financial', {
      url: '/financial',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/tab-financial.html',
          controller: 'FinancialCtrl'        
        }
      }
    })

    .state('tab.how-to-make-payment', {
      url: '/how-to-make-payment',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/how-to-make-payment.html',
          controller: 'HowToMakePaymentCtrl'        
        }
      }
    })

    .state('tab.update-how-to-make-payment', {
      url: '/update-how-to-make-payment',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/update-how-to-make-payment.html',
          controller: 'UpdateHowToMakePaymentCtrl'        
        }
      }
    })    

    .state('tab.payment-history', {
      url: '/payment-history',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/payment-history.html',
          controller: 'PaymentHistoryCtrl'        
        }
      }
    })    
    
    .state('tab.revenue-list', {
      url: '/revenue-list/{balanceSheetId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/revenue-list.html',
          controller: 'RevenueListCtrl'        
        }
      }
    })    

    .state('tab.payment-detail', {
      url: '/payment-detail/{revenueId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/payment-detail.html',
          controller: 'PaymentDetailCtrl'        
        }
      }
    })

    .state('tab.revenue-detail', {
      url: '/revenue-detail/{revenueId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/revenue-detail.html',
          controller: 'PaymentDetailCtrl'        
        }
      }
    })    

    .state('tab.edit-payment-detail', {
      url: '/edit-payment-detail/{revenueId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/edit-payment-detail.html',
          controller: 'EditPaymentDetailCtrl'        
        }
      }
    })        

    .state('tab.expense-list', {
      url: '/expense-list/{balanceSheetId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/expense-list.html',
          controller: 'ExpenseListCtrl'        
        }
      }
    })        

    .state('tab.expense-detail', {
      url: '/expense-detail/{expenseId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/expense-detail.html',
          controller: 'ExpenseDetailCtrl'        
        }
      }
    })                

    .state('tab.edit-expense-detail', {
      url: '/expense-detail-edit/{expenseId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/edit-expense-detail.html',
          controller: 'EditExpenseDetailCtrl'        
        }
      }
    })                

    .state('tab.reserves-detail', {
      url: '/reserves-detail',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/reserves-detail.html',
          controller: 'ReservesDetailCtrl'        
        }
      }
    })                

    .state('tab.dues-list', {
      url: '/dues-list',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/dues-list.html',
          controller: 'DuesListCtrl'        
        }
      }
    })                    

    .state('tab.balance-sheet-list', {
      url: '/balance-sheet-list',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/balance-sheet-list.html',
          controller: 'BalanceSheetListCtrl'        
        }
      }
    })                    

    .state('tab.balance-sheet', {
      url: '/balance-sheet/{balanceSheetId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/balance-sheet.html',
          controller: 'BalanceSheetCtrl'        
        }
      }
    })                    

    .state('tab.start-balance-sheet', {
      url: '/start-balance-sheet',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/start-balance-sheet.html',
          controller: 'StartBalanceSheetCtrl'        
        }
      }
    })                    

    // .state('tab.close-balance-sheet', {
    //   url: '/close-balance-sheet/{balanceSheetId}',
    //   cache: false,
    //   views: {
    //     "tab-financial": {
    //       templateUrl: 'templates/financial/close-balance-sheet.html',
    //       controller: 'CloseBalanceSheetCtrl'        
    //     }
    //   }
    // })                    

    .state('tab.manage-dues', {
      url: '/manage-dues/{duesId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/manage-dues.html',
          controller: 'ManageDuesCtrl'        
        }
      }
    })                        

    .state('tab.manage-revenue', {
      url: '/manage-revenue/{balanceSheetId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/manage-revenue.html',
          controller: 'ManageRevenueCtrl'        
        }
      }
    })                        

    .state('tab.manage-expense', {
      url: '/manage-expense/{balanceSheetId}',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/manage-expense.html',
          controller: 'ManageExpenseCtrl'        
        }
      }
    })                        

    .state('tab.manage-reserves', {
      url: '/manage-reserves',
      cache: false,
      views: {
        "tab-financial": {
          templateUrl: 'templates/financial/manage-reserves.html',
          controller: 'ManageReservesCtrl'        
        }
      }
    })                        

    .state('tab.finview', {
      url: '/finview',
      cache: false,      
      views: {
        'tab-financial': {
          templateUrl: 'templates/region/region-fin-overview.html',
          controller: 'RegionFinancialOverviewCtrl'
        }
      }
    })

    .state('tab.addfinview', {
      url: '/addfinview/{regionUniqueName}',
        views: {
          'tab-financial': {
            templateUrl: 'templates/region/add-region-fin-overview.html',
            controller: 'AddRegionFinancialOverviewCtrl'
          }
        }
    })

    .state('tab.editfinancial', {
      url: '/editfinancial/{id}',
        views: {
          'tab-financial': {
            templateUrl: 'templates/region/edit-region-fin-overview.html',
            controller: 'EditRegionFinancialOverviewCtrl'
          }
        }
    })

    .state('tab.findet', {
      url: '/findet/{regionUniqueName}/{year}/{reqDetails}',
      cache: false,            
      views: {
        'tab-financial': {
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

    // .state('tab.upload-profile-picture', {
    //   url: '/account-update',
    //   cache: false,
    //   views: {
    //     "tab-account": {
    //       templateUrl: 'templates/account/account-update.html',
    //       controller: 'AccountUpdateCtrl'        
    //     }
    //   }
    // })

    .state('tab.invite-citizen', {
      url: '/invite-citizen',
      cache: false,
      views: {
        "tab-region": {
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

    .state('home', {
      url: '/home',
      templateUrl: 'templates/account/home.html',
      controller: 'HomeCtrl',
      cache: false
    })

    .state('community-address', {
      url: '/community-address',
      templateUrl: 'templates/account/community-address.html',
      controller: 'CommunityAddressCtrl',
      cache: true
    })

    .state('community-info', {
      url: '/community-info',
      templateUrl: 'templates/account/community-info.html',
      controller: 'CommunityInfoCtrl',
      cache: true
    })

    .state('your-info', {
      url: '/your-info',
      templateUrl: 'templates/account/your-info.html',
      controller: 'YourInfoCtrl',
      cache: true
    })

    .state('invite-recover', {
      url: '/invite-recover',
      templateUrl: 'templates/account/invite-recover.html',
      controller: 'InvitationRecoverCtrl',
      cache: false
    })    

    .state('request-invitation', {
      url: '/request-invitation',
      templateUrl: 'templates/account/region-lookup.html',
      controller: 'RegionLookUpCtrl',
      cache: false
    })    

    .state('register', {
      url: '/register',
      templateUrl: 'templates/account/register.html',
      controller: 'RegisterCtrl',
      cache: false
    });

    $urlRouterProvider.otherwise('/tab/region/native');

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
    InvitePage: 'Invite Citizen',
    Currency: 'Rs',
    LegContact: 'Legislative Contacts',
    ExecContact: 'Executive Offices',
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
    InvitePage: 'Invite Resident',
    Currency: '$',
    LegContact: 'Board Members',
    ExecContact: 'Management Offices',
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
