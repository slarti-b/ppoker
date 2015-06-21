"use strict";

module.exports = {
	PP_Exception: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	PP_MeetingNotFoundException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	PP_PlayerNotFoundException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	PP_NotAuthorisedException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	}

};
