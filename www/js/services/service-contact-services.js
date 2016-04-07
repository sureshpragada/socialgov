angular.module('service-contact.services', [])

.factory('ServiceContactService', ['CacheFactory', 'LogService', 'SettingsService', '$q', '$state', function(CacheFactory, LogService, SettingsService, $q, $state) {
  var serviceContactCache;
  if (!CacheFactory.get('serviceContactCache')) {
    serviceContactCache = CacheFactory('serviceContactCache', {
      maxAge: 1 * 60 * 60 * 1000, // 1 Hour : as other residents may need this service contact
      deleteOnExpire: 'none', 
      storageMode: 'localStorage'
    });
  }

  return {
    getServiceContacts: function(regionUniqueName) {
      console.log("region : " + regionUniqueName);
      var deferred = $q.defer();
      var cachedObjectInfo=serviceContactCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        // console.log("Found service contact hit " + JSON.stringify(cachedObjectInfo) + " Item : " + JSON.stringify(serviceContactCache.get(regionUniqueName)));        
        deferred.resolve(serviceContactCache.get(regionUniqueName));  
      } else {
        console.log("No hit, attempting to retrieve service contacts from parse " + regionUniqueName + " Info : " + JSON.stringify(cachedObjectInfo));
        var ServiceContact = Parse.Object.extend("ServiceContact");
        var query = new Parse.Query(ServiceContact);
        query.equalTo("region", regionUniqueName);
        query.equalTo("status", "A");  
        query.include("user");
        query.descending("createdAt");
        query.find().then(function(personalServiceContacts) {
          serviceContactCache.remove(regionUniqueName);
          serviceContactCache.put(regionUniqueName, personalServiceContacts);          
          deferred.resolve(serviceContactCache.get(regionUniqueName));
        },function(error) {
          if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
            console.log("Unable to refresh service contacts hence passing cached one " + regionUniqueName + " " + JSON.stringify(error));
            deferred.resolve(serviceContactCache.get(regionUniqueName));  
          } else {
            deferred.reject(error);
          }
        });          
      }
      return deferred.promise;
    },
    refreshServiceContacts: function(regionName) {
      regionCache.remove(regionName);
    },
    getServiceContactByObjectId: function(regionName, serviceContactObjectId) {
      var deferred = $q.defer();      
      this.getServiceContacts(regionName).then(function(serviceContacts){
        for(var i=0;i<serviceContacts.length;i++) {
          if(serviceContacts[i].objectId==serviceContactObjectId) {
            deferred.resolve(serviceContacts[i]);
          }
        }
        deferred.reject("Unable to find the service contact in cache " + serviceContactObjectId);
      }, function(error){
        deferred.reject(error);
      });
      return deferred.promise;
    },
    addServiceContact: function(inputServiceContact) {
      var ServiceContact = Parse.Object.extend("ServiceContact");
      var serviceContact = new ServiceContact();
      return serviceContact.save(inputServiceContact);
    }
  };
}])
;
