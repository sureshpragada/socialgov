angular.module('user-residency.services', [])

.factory('UserResidencyService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', function(CacheFactory, RegionService, NotificationService, LogService) {
	return{
		createUserResidency: function(inputUserResidency, inputUser){
			var UserResidency = Parse.Object.extend("UserResidency");
			var userResidency = new UserResidency();
			if(inputUser==null){
				this.getUserByPhoneNumber(userResidency, inputUserResidency.phoneNum);
			}
			else{
				userResidency.set("user", inputUser);
			}
			userResidency.set("homeNo", inputUserResidency.homeNumber);
			userResidency.set("homeOwner", inputUserResidency.homeOwner==true?true:false);
			userResidency.set("residency", Parse.User.current().get("residency"));
			userResidency.set("role","CTZEN");
			return userResidency.save();
		},
		getUserByPhoneNumber: function(userResidency, number) {
	      var userQuery = new Parse.Query(Parse.User);
	      userQuery.equalTo("phoneNum", number);
	      userQuery.first({
  			success: function(user) {
  			  	console.log(JSON.stringify(user));
  			  	userResidency.set("user",user);
			  },
			  error: function(error) {
			    console.log("Unable to get user by phone number.");
			  }
		  });
	    },
	    getResidencyByPhoneNumber: function(number) {
	    	var userQuery = new Parse.Query(Parse.User);
	      	userQuery.equalTo("phoneNum", number);
	      	return userQuery.first();
	    }
	    // getUserResidencies: function(){
	    // 	var userResidency = new Parse.Query(Parse.User);
	    // 	return userResidency.find();
	    // }
	};

}]);	