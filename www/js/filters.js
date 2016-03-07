angular.module('starter.filters', [])
.filter('nl2br', function() {
  return function(input) {
	if (!input) return input;
	   return input.replace(/\n\r?/g, '<br/>');  	
  };
})
.filter('capitalize', function() {
    return function(input) {
      return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
})
.filter('ourcurrency', function() {
    return function(input) {
    	if(input) {
    		return REGION_SETTINGS.currencySymbol + " " + input;	
    	} else {
    		return input;
    	}
    }
})
.filter('currencyIndianFormat', function() {
    return function(input) {
      if(input) {
        return input.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            style: 'currency',
            currency: 'INR'
        });
      } else {
        return input;
      }
    }
})
;