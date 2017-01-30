angular.module('notification.services', ['ionic'])

.factory('NotificationService', ['$http', 'LogService', 'RegionService', '$cordovaPush', '$cordovaEmailComposer', '$cordovaClipboard', '$cordovaDialogs', function($http, LogService, RegionService, $cordovaPush, $cordovaEmailComposer, $cordovaClipboard, $cordovaDialogs) {
  return {
    getInstallationByInstallationId: function(installationId, successCallback, errorCallback) {
      var paramsRequest={"where":{"objectId":installationId}};
      var req = {
       method: 'GET',
       url: PARSE_SERVER_URL+'installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       params: paramsRequest
      };
      $http(req).then(successCallback, errorCallback);
    },
    getInstallationByUserId: function(userObjectId, successCallback, errorCallback) {
      Parse.Cloud.run('getInstallationByUserId', {"userObjectId": userObjectId}, {
        success: successCallback, 
        error: errorCallback
      });
    },                 
    pushNotification: function(residency, message, successCallback, errorCallback) {
      Parse.Cloud.run('pushNotification', {"residency": residency, "message":message}, {
        success: function(response) {
          console.log("Response from pushNotification : " + JSON.stringify(response));
          LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
        }, 
        error: function(error) {
          console.log("Error from pushNotification : " + JSON.stringify(error));
          LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
        }
      });
    },         
    pushNotificationToUserList: function(userList, message) {
      Parse.Cloud.run('pushNotificationToUserList', {"userList": userList, "message":message}, {
        success: function(response) {
          console.log("Response from pushNotification : " + JSON.stringify(response));
          LogService.log({type:"INFO", message: "Push notification is success " + JSON.stringify(response)}); 
        }, 
        error: function(error) {
          console.log("Error from pushNotification : " + JSON.stringify(error));
          LogService.log({type:"ERROR", message: "Push notification is failed " + JSON.stringify(error)}); 
        }
      });
    },             
    registerDevice: function() {
      if(ionic.Platform.isWebView() && ionic.Platform.isAndroid()) {
        var androidConfig = {
          "senderID": GCM_SENDER_ID
        };
        $cordovaPush.register(androidConfig).then(function(result) {
          LogService.log({type:"INFO", message: "Registration attempt to GCM is success " + JSON.stringify(result)}); 
        }, function(err) {
          LogService.log({type:"ERROR", message: "Registration attempt to GCM is failed for  " + Parse.User.current().id + " " +  JSON.stringify(err)}); 
        });
      } else if(ionic.Platform.isWebView() && ionic.Platform.isIOS()){
        var self=this;
        var iosConfig = {
            "badge": true,
            "sound": true,
            "alert": true,
          };          
        $cordovaPush.register(iosConfig).then(function(deviceToken) {
          var channelList=RegionService.getRegionHierarchy();            
          LogService.log({type:"INFO", message: "iOS Registration is success : " + deviceToken + " registering for channel list : " + channelList + " for user : " + Parse.User.current().id});             
          self.addIOSInstallation(Parse.User.current().id, deviceToken, channelList);            
        }, function(err) {
          LogService.log({type:"ERROR", message: "IOS registration attempt failed for " + Parse.User.current().id + "  " + JSON.stringify(err)}); 
        });
      }
    },
    addAndroidInstallation: function(userObjectId, deviceToken, channelArray) {
      var req = {
       method: 'POST',
       url: PARSE_SERVER_URL+'installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       data: {
          "deviceType": "android",
          "pushType": "gcm",
          "deviceToken": deviceToken,
          "GCMSenderId": GCM_SENDER_ID,
          "channels": channelArray,
          "timeZone": "Asia/Kolkata",
          "user": {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userObjectId
          }
        }
      };
      var self=this;
      $http(req).then( function(result){ 
          self.updateUserDeviceRegStatus();
          LogService.log({type:"INFO", message: "Registered android device " + JSON.stringify(result.data)}); 
        }, function(error) {
          LogService.log({type:"ERROR", message: "Failed to register android device " + JSON.stringify(error)});                        
      });
    },
    addIOSInstallation: function(userObjectId, deviceToken, channelArray) {
      var req = {
       method: 'POST',
       url: PARSE_SERVER_URL+'installations',
       headers: {
        'X-Parse-Application-Id': PARSE_APPLICATION_KEY,'X-Parse-REST-API-Key': PARSE_REST_API_KEY
       },
       data: {
          "deviceType": "ios",
          "deviceToken": deviceToken,
          "channels": channelArray,
          "appIdentifier": IOS_APP_IDENTIFIER,
          "timeZone": TIMEZONE_ID,            
          "user": {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userObjectId
          }
        }
      };
      var self=this;
      $http(req).then(function(result){ 
          self.updateUserDeviceRegStatus();
          LogService.log({type:"INFO", message: "Registered IOS device " + JSON.stringify(result.data)}); 
        }, function(error) {
          LogService.log({type:"ERROR", message: "Failed to register IOS device " + JSON.stringify(error)});                        
      });
    },    
    updateUserDeviceRegStatus: function() {
      var user=Parse.User.current();
      user.set("deviceReg", "Y");
      user.save();
    },
    sendInvitationCode: function(invitationCode, phoneNumber, regionName) {
      console.log("Send invitation code : " + invitationCode + " Phone number : " + phoneNumber + " Region name : " + regionName);
      if(ENV=="PROD") {        
        //sendSmsPlivo
        Parse.Cloud.run('sendSmsPlivo', {"phoneNumber": phoneNumber, "invitationCode": invitationCode, "regionName": regionName}, {
          success: function(response) {
            console.log("Response from sendSmsPlivo : " + JSON.stringify(response));
            LogService.log({type:"INFO", message: "SMS Send is success " + JSON.stringify(response)}); 
          }, 
          error: function(error) {
            console.log("Response from sendSmsPlivo : " + JSON.stringify(error));
            LogService.log({type:"ERROR", message: "SMS send is failed " + JSON.stringify(error)}); 
          }
        });
      }
    },
    sendInvitationCodeV2: function(messageType, phoneNumber, regionName, invitationCode) {
      console.log("Send invitation code : " + invitationCode + " Phone number : " + phoneNumber + " Region name : " + regionName + " Message type : " + messageType);
      if(ENV=="PROD") {        
        //sendSmsPlivo
        Parse.Cloud.run('sendSmsPlivoV2', {"phoneNumber": phoneNumber, "invitationCode": invitationCode, "regionName": regionName, "messageType": messageType}, {
          success: function(response) {
            console.log("Response from sendSmsPlivo : " + JSON.stringify(response));
            LogService.log({type:"INFO", message: "SMS Send is success " + JSON.stringify(response)}); 
          }, 
          error: function(error) {
            console.log("Response from sendSmsPlivo : " + JSON.stringify(error));
            LogService.log({type:"ERROR", message: "SMS send is failed " + JSON.stringify(error)}); 
          }
        });
      }
    },    
    sendTextMessageToResident: function(regionName, phoneNumbers, message) {
      // phoneNumbers="919652533122";      
      console.log("Send text message : " + message + " Phone number : " + phoneNumbers + " Region name : " + regionName);

      if(ENV=="PROD") {        
        Parse.Cloud.run('sendSMSViaTextLocalV1', {"phoneNumbers": phoneNumbers, "message": message, "regionName": regionName}).then(function(response) {
          console.log("Response from sendSmsTextLocal : " + JSON.stringify(response));
          LogService.log({type:"INFO", message: "SMS Send is success " + JSON.stringify(response)}); 
        }, function(error) {
          console.log("Response from sendSmsTextLocal : " + JSON.stringify(error));
          LogService.log({type:"ERROR", message: "SMS send is failed " + JSON.stringify(error)}); 
        });
      }
    },        
    openEmailClient: function(subject, body, attachment, attachmentName) {
      if(ionic.Platform.isWebView()) {        
        $cordovaEmailComposer.addAlias('gmail', 'com.google.android.gm');
        $cordovaEmailComposer.isAvailable().then(function() {
          var email = {
            app: "gmail",
            to: "",
            attachments: [
              'base64:'+attachmentName+'//' + btoa(attachment)
            ],
            subject: subject,
            body: body,
            isHtml: true
          };          
           $cordovaEmailComposer.open(email).then(null, function(){
            LogService.log({type:"ERROR", message: "Email balance sheet report has been cancelled "});           
            $cordovaDialogs.alert("You have chose not to email balance sheet.", 'Balance Sheet Report', 'OK');
           });
         }, function () {
            $cordovaClipboard.copy(attachment).then(function () {
              $cordovaDialogs.alert("Email is not setup on your device hence copied the report to your clipboard.", 'Balance Sheet Report', 'OK');
            }, function () {
              $cordovaDialogs.alert("Unable to copy balance sheet report to clipboard.", 'Balance Sheet Report', 'OK');
            });          
         });            
      } else {
        console.log("Not a web view, hence skipping email compose");
      }    
    },
    sendEmail: function(toEmail, fromEmail, subjectText, bodyText) {
      if(ENV=="PROD") {        
        Parse.Cloud.run('sendEmailViaMailgun', {"to": toEmail, "from": fromEmail, "subject": subjectText, "body": bodyText}, {
          success: function(response) {
            console.log("Success Response from sendEmailViaMailgun : " + JSON.stringify(response));
            LogService.log({type:"INFO", message: "Email Send is success " + JSON.stringify(response)}); 
          }, 
          error: function(error) {
            console.log("Error Response from sendEmailViaMailgun : " + JSON.stringify(error));
            LogService.log({type:"ERROR", message: "Email send is failed " + JSON.stringify(error)}); 
          }
        });
      }
    }
  };
}])
;
