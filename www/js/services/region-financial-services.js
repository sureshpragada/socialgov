angular.module('region-financial.services', [])

.factory('RegionFinancialService', ['CacheFactory', '$q', function(CacheFactory, $q) {
  var regionFinancials=null;
  return {
    getRegionFinancials: function(regionUniqueNameList) {
      // console.log("List being requested " + JSON.stringify(regionUniqueNameList));
      var deferred = $q.defer();      
      if(regionFinancials!=null) {
        console.log("Returning existing records");
        deferred.resolve(regionFinancials);  
      } else {
        console.log("Retrieving financial records");
        var RegionFinancial = Parse.Object.extend("RegionFinancial");
        var query = new Parse.Query(RegionFinancial);
        query.containedIn("regionUniqueName", regionUniqueNameList);
        query.equalTo("status","A");
        query.descending("year");
        query.find({
          success: function(financials) {
            console.log("Successfully retrieved financial records");            
            regionFinancials=[];            
            for(var i=0;i<financials.length;i++) {
              var financialEntry={key: financials[i].get("year")+"-"+financials[i].get("regionUniqueName"), value: financials[i]};
              regionFinancials.push(financialEntry);
            }
            // console.log("Completed cache development " + JSON.stringify(regionFinancials));
            deferred.resolve(regionFinancials);  
          },
          error: function(error) {
            console.log("Failed to get financial records");            
            deferred.reject(error)
          }
        }); 
      }
      return deferred.promise;
    },
    getRegionFinancialDetails: function(regionUniqueName, year) {
      if(regionFinancials!=null) {
        for(var i=0;i<regionFinancials.length;i++) {
          if(regionFinancials[i].key==year+"-"+regionUniqueName) {
            return regionFinancials[i].value;
          }
        }
      }
      return null;
    }
  };
}])
;
