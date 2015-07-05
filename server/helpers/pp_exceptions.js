"use strict";

module.exports = {
	/**
	 * Basic Exception class
	 * @param message
	 * @constructor
	 */
	PP_Exception: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		//Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	/**
	 * Exception if meeting is not found
	 * @param message
	 * @constructor
	 */
	PP_MeetingNotFoundException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		//Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	/**
	 * Exception if user is not logged in
	 * @param message
	 * @constructor
	 */
	PP_NotLoggedInException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		//Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	/**
	 * Exception if player is not found
	 * @param message
	 * @constructor
	 */
	PP_PlayerNotFoundException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		//Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	},

	/**
	 * Exception if actions is not authorised
	 * @param message
	 * @constructor
	 */
	PP_NotAuthorisedException: function(message){
		this.constructor.prototype.__proto__ = Error.prototype;
		//Error._captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	}

};
