"use strict";

var PP_Jira = require('./pp_jira').PP_Jira;


module.exports = {
	/**
	 * Generates an rfc4122 version 4 compliant globally unique identifier or guid
	 * @returns {string}
	 */
	createGUID: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {
			var r = Math.random() * 16 | 0;
			var v = 'x' === c ? r : (r & 0x3 | 0x8);
			return v.toString( 16 );
		} );
	},


	login: function(username, password, callback){
		var jira = new PP_Jira();
		jira.authenticate(username, password, callback);
	}

};


