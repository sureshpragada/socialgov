angular.module('user-residency.services', [])

.factory('UserResidencyService', ['CacheFactory', 'RegionService', 'NotificationService', 'LogService', 'AccountService', function(CacheFactory, RegionService, NotificationService, LogService, AccountService) {
	return{
		createUserResidency: function(user){
			var UserResidency = Parse.Object.extend("UserResidency");
			var userResidency = new UserResidency();
			userResidency.set("user", user);
			userResidency.set("homeNo", user.get("homeNo"));
			userResidency.set("homeOwner", user.get("homeOwner")==true?true:false);
			userResidency.set("residency", user.get("residency"));
			userResidency.set("role",user.get("role"));
			return userResidency.save();
		},
		createUserResidencyWhenUserExists: function(inputUser, user) {
			var UserResidency = Parse.Object.extend("UserResidency");
			var userResidency = new UserResidency();
			userResidency.set("user", user);
			userResidency.set("homeNo", inputUser.homeNumber);
			userResidency.set("homeOwner", inputUser.homeOwner==true?true:false);
			userResidency.set("residency", AccountService.getUserResidency());
			userResidency.set("role","CTZEN");
			return userResidency.save();	
		},
	    getUserByPhoneNumber: function(number) {
	    	var userQuery = new Parse.Query(Parse.User);
	      	userQuery.equalTo("phoneNum", number);
	      	return userQuery.first();
	    },
	    getUserResidencyByUserAndResidency: function(user, residency) {
	    	var UserResidency = Parse.Object.extend("UserResidency");
			var query = new Parse.Query(UserResidency);
			query.equalTo("user", user);
			query.equalTo("residency", residency);
			return query.find();
	    }
	};

}]);	