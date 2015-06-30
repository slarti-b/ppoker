"use strict";


function PP_Auth(){}

/**
 * Generates an rfc4122 version 4 compliant globally unique identifier or guid
 * @returns {string}
 */
PP_Auth.prototype.createGUID = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {
		var r = Math.random() * 16 | 0;
		var v = 'x' === c ? r : (r & 0x3 | 0x8);
		return v.toString( 16 );
	} );
};

module.exports = {
	PP_Auth: PP_Auth
};


