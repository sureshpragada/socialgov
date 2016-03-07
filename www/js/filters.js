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
.filter('formatCurrency', function() {
    return function(input) {
      if(!isNaN(input)) {
        if(REGION_SETTINGS.locale=="en-IN") {
          input=input.toFixed(2);            
          var n1 = input.split('.');
          var n2 = n1[1] || null;          
          n1 = n1[0].replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
          input = n2 ? n1 + '.' + n2 : n1;
          return "Rs " + input;          
        } else {
          return "$ " + input.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
        }        
      } else {
        return input;
      }
    }
})
;