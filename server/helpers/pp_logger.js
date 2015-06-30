"use strict";

var util = require( 'util' );

// Get config
var settings = require( '../settings' ).settings;

/**
 * Logger class
 * @constructor
 */
function PP_Logger() {
}

PP_Logger.prototype.log = function(message){
	if( settings.debug ) {
		console.log(message);
	}
};

PP_Logger.prototype.log_o = function(obj, depth){
	if( settings.debug ){
		if( !depth ) {
			depth = null;
		}
		console.log( util.inspect( obj, { depth: depth } ) );
	}
};


module.exports = {
	PP_Logger: PP_Logger
};
