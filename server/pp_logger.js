var util = require( 'util' );

// Get config
var settings = require( './settings' ).settings;

function PP_Logger(){
	this.log = function(message){
		if( settings.debug ) {
			console.log(message);
		}
	}

	this.log_o = function(obj, depth){
		if( settings.debug ){
			if( !depth ) {
				depth = null;
			}
			console.log( util.inspect( obj, { depth: depth } ) );
		}
	}

}


module.exports = {
	PP_Logger: PP_Logger
};
