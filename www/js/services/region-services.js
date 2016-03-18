angular.module('region.services', [])

.factory('RegionService', ['CacheFactory', 'LogService', 'SettingsService', '$q', '$state', 'PictureManagerService', function(CacheFactory, LogService, SettingsService, $q, $state, PictureManagerService) {
  var regionHeirarchy=null;
  var regionCache;
  if (!CacheFactory.get('regionCache')) {
    regionCache = CacheFactory('regionCache', {
      maxAge: 15 * 60 * 1000, // 1 Hour
      deleteOnExpire: 'none'
    });
  }

  return {
    getRegion: function(regionUniqueName) {
      var deferred = $q.defer();
      var cachedObjectInfo=regionCache.info(regionUniqueName);
      if(cachedObjectInfo!=null && !cachedObjectInfo.isExpired) {
        // console.log("Found hit " + JSON.stringify(regionCache.info()) + " Item info : " + JSON.stringify(cachedObjectInfo));
        deferred.resolve(regionCache.get(regionUniqueName));  
      } else {
        console.log("No hit, attempting to retrieve from parse " + regionUniqueName + " Info : " + JSON.stringify(cachedObjectInfo));
        var Region = Parse.Object.extend("Region");
        var query = new Parse.Query(Region);
        query.equalTo("uniqueName", regionUniqueName);
        query.find({      
          success: function(regions) {
            regionCache.remove(regionUniqueName);
            regionCache.put(regionUniqueName, regions[0]);          
            deferred.resolve(regions[0]);
          }, 
          error: function(error) {
            if(cachedObjectInfo!=null && cachedObjectInfo.isExpired) {
              console.log("Unable to refresh region hence passing cached one " + regionUniqueName + " " + JSON.stringify(error));
              deferred.resolve(regionCache.get(regionUniqueName));  
            } else {
              deferred.reject(error);
            }
          }
        }); 
      }
      return deferred.promise;
    },
    getRegionListFromCache: function() {
      var regions=[];      
      if(regionHeirarchy!=null) {
        for(var i=0;i<regionHeirarchy.length;i++) {
          var region=regionCache.get(regionHeirarchy[i]);  
          if(region!=null) {
            regions.push(region);
          }
        }
      }
      return regions;
    },
    getLiteRegionList: function(selectQuery, value) {
      // TODO :: Cache these for short interval and flush aggressively
      var Region = Parse.Object.extend("Region");
      var query = new Parse.Query(Region);
      query.select("name", "uniqueName", "parentRegion")
      query.ascending("name");
      if(selectQuery=="parent") {
        query.equalTo("parentRegion", value);  
      } else if(selectQuery=="regionType") {
        query.containedIn("type", value);        
      } else {
        query.equalTo("uniqueName", value);        
      }
      return query.find();       
    },
    initializeRegionCache: function(region) {
      regionHeirarchy=[region.get("uniqueName")];
      for(var i=0;i<region.get("parentRegion").length;i++) {
        regionHeirarchy.push(region.get("parentRegion")[i]);
      }
      SettingsService.setPreference("regionHeirarchy", regionHeirarchy);
      console.log("Final region list for cache : " + JSON.stringify(regionHeirarchy));
      if(ionic.Platform.isAndroid()) {
        LogService.log({type:"INFO", message: "Final region list for cache " + JSON.stringify(regionHeirarchy)});   
      }            
      var Region = Parse.Object.extend("Region");
      var query = new Parse.Query(Region);
      // TODO :: Evaluate whether it helps to load if it missing in cache      
      query.containedIn("uniqueName", regionHeirarchy);  
      query.find({
        success: function(data) {
          for(var i=0;i<data.length;i++) {
            regionCache.put(data[i].get("uniqueName"), data[i]);
          }
        },
        error: function(error) {
          console.log("Error while initializing the regionCache " + JSON.stringify(error));
        }
      });
    },
    initializeRegionCacheByCurrentUser: function() {
      var self=this;
      if(Parse.User.current()!=null && Parse.User.current().get("residency")!=null) {
        var region=regionCache.get(Parse.User.current().get("residency"))
        if(region!=null) {
          REGION_SETTINGS=region.get("settings");
          self.initializeRegionCache(region);
        } else {
          self.getRegion(Parse.User.current().get("residency")).then(function(region) {
            REGION_SETTINGS=region.get("settings");
            self.initializeRegionCache(region);
          }, function(error) {
            console.log("Unable to refresh region cache by user " + JSON.stringify(error));
          });
        }
      }
    },    
    getAllowedRegions: function(residency) {
      var residencyRegion=regionCache.get(residency);
      if(residencyRegion==null) {
        console.log("Residence region is missing in cache " + JSON.stringify(residency));
        return [{id:residency, label:residency[0].toUpperCase()+residency.substring(1)}];
      } else {
        var regionHeirarchyList=residencyRegion.get("parentRegion");
        var allowedRegionList=[{id: residencyRegion.get("uniqueName"), label: residencyRegion.get("name")}];
        for(var i=0;i<regionHeirarchyList.length;i++) {
          var region=regionCache.get(regionHeirarchyList[i]);
          if(region!=null) {
            allowedRegionList.push({id: region.get("uniqueName"), label:region.get("name")});
          }
        }
        return allowedRegionList;        
      }
    },
    getRegionHierarchy: function() {
      if(regionHeirarchy==null) {
        var regionHierarchyFromCache=SettingsService.getPreference("regionHeirarchy");
        if(regionHierarchyFromCache!=null) {
          console.log("Returning region hierarchy from cache");
          return regionHierarchyFromCache;
        } else {
          this.getRegion(Parse.User.current().get('residency')).then(function(data) {
            regionHeirarchy=[data.get("uniqueName")];
            var parentRegionArray=data.get("parentRegion");
            for(var i=0;i<parentRegionArray.length;i++) {
              regionHeirarchy.push(parentRegionArray[i]);
            }
          }, function(error) {
            console.log("Unable to form region hierarchy");
          });          
          return [Parse.User.current().get("residency")];            
        }
      } else {
        return regionHeirarchy;
      }
    },
    updateRegion: function(regionName, region) {
      regionCache.remove(regionName);
      regionCache.put(regionName, region);                
    },
    gotoCoverPhoto: function() {
      PictureManagerService.reset();
      PictureManagerService.setFromPage("tab.region");
      PictureManagerService.setFromPagePathParamValue({regionUniqueName: "native"});
      $state.go("tab.community-picman");
    },
    updateCoverPhoto: function(region, photoUrl) {
      var images=region.get("posterImages");
      if(images!=null && images.length>0) {
        images.unshift(photoUrl);
      } else {
        images=[photoUrl];
      }
      region.set("posterImages", images);
      region.save();
      this.updateRegion(region.get("uniqueName"), region);
    },
    updateReserve: function(region, reserveInput) {
      var currentReserve=region.get("reserve");
      if(currentReserve!=null) {
        if(reserveInput.reserveAmount>currentReserve.reserveAmount) {
          region.set("reserve", {reserveAmount: reserveInput.reserveAmount, progress: "UP"});
        } else {
          region.set("reserve", {reserveAmount: reserveInput.reserveAmount, progress: "DOWN"});
        }
        return region.save();
      } else {
        region.set("reserve", {reserveAmount: reserveInput.reserveAmount, progress: "UP"});
        return region.save();
      }
    },
    getRegionSettings: function(regionName) {
      var region=regionCache.get(regionName);  
      if(region!=null) {
        return region.get("settings");
      } 
      return REGION_SETTINGS;
    },
    getFunctionControllersFromRegionSettings: function(regionSettings, functionName) {
      var whoControlsFunction=[]; 
      for(var i=0;i<regionSettings.permissions.length;i++) {
        if(regionSettings.permissions[i].functionName==functionName) {
          whoControlsFunction=regionSettings.permissions[i].allowedRoles;
          break;
        }
      }
      return whoControlsFunction;
    },    
    getContactFromNewCommunity: function(regionUniqueName) {
      var Region = Parse.Object.extend("Region");
      var query = new Parse.Query(Region);
      query.equalTo("uniqueName", regionUniqueName);
      return query.find();
    }
  };
}])
;
