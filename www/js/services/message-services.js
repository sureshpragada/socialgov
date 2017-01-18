angular.module('message.services', [])

.factory('MessageService', ['$http', 'SettingsService', '$q', function($http, SettingsService, $q) {
  return {
    sendViaMessage: function(messageInfo) {
      console.log(REGION_SETTINGS);
      var req = {
       method: 'POST',
       url: 'http://api.textlocal.in/send',
       headers: {
          'Content-Type': undefined
       },
       data: {
          "username": "kaatnam.pradeep@gmail.com",
          "hash": "2a97890c4edec726a83f86f5a09e781f2ace3868",
          "apiKey": "keHBCbmpgco-JhNZWdalbVz32jLZfhvrVGoAlMvXUn",
          "message": messageInfo.msg,
          "sender": "TXTLCL",
          "numbers": "917207774878"
        }
      };
      var self=this;
      $http(req).then(function(result){ 
          console.log(JSON.stringify(result));
          //LogService.log({type:"INFO", message: "Registered android device " + JSON.stringify(result.data)}); 
        }, function(error) {
          console.log("We got error : " + JSON.stringify(error));
          //LogService.log({type:"ERROR", message: "Failed to register android device " + JSON.stringify(error)});                        
      });
    }
  };
}]);
