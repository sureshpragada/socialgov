String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.convertToFlatString = function() {
    var result="";
    for(var i=0;i<this.length;i++) {
        result+=this[i];
        if(i!=this.length-1) {
            result+=", ";
        }
    }
    return result;
};

Array.prototype.removeSpecialSymbol = function() {
  for(var j=0; j<this.length; j++){
    delete this[j].$$hashKey;
  }
  return this;
};


Array.prototype.removeDuplicates = function() {
    return this.sort().reduce(function(a, b){ 
        if (b != a[0]) 
            a.unshift(b); 
        return a 
    }, []);
};

Date.prototype.getTimeWithMeridiem=function() {
    var hours=this.getHours();
    var minutes=this.getMinutes();
    var amOrPm=hours>11?"PM":"AM";
    hours=hours>11?hours-12:hours;
    minutes=minutes<10?"0"+minutes:minutes;
    return hours+":"+minutes+" "+amOrPm;
};

Date.prototype.addStringTimeToDate=function(time) {
	return new Date(this.toDateString() + " " + time);
};

Date.prototype.addDateTimeToDate=function(time) {
	this.setHours(time.getHours());
	this.setMinutes(time.getMinutes());
	this.setSeconds(0);
	this.setMilliseconds(0);
	// this.setSeconds(time.getSeconds());
	// return new Date(this.toDateString() + " " + time);
};

Date.prototype.firstDayOfMonth=function() {
	return new Date(this.getFullYear(), this.getMonth(), 1);
};

Date.prototype.endOfTheDay=function() {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate(), 23, 0, 0, 0);
};

Date.prototype.lastDayOfMonth=function() {
	return new Date(this.getFullYear(), this.getMonth() + 1, 0);
};

Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};

Date.prototype.addMonths = function(months)
{
    var dat = new Date(this.valueOf());
    dat.setMonth(dat.getMonth() + months);
    return dat;
};
