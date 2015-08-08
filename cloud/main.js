
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("validateDigits", function(request, response) {
  
	Parse.Cloud.httpRequest({
	  url: request.params.digitsUrl,
	  headers: {
	    'Authorization': request.params.authToken
	  },
	  success: function(httpResponse) {
	  	response.success(httpResponse.data);	
	  },
	  error: function(httpResponse) {
	  	response.error('Request failed with response code : ' + httpResponse.status);	
	  }
	});

});
