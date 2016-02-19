String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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

Date.prototype.lastDayOfMonth=function() {
	return new Date(this.getFullYear(), this.getMonth() + 1, 0);
};

Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};
