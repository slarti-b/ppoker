"use strict";

// Get config
var settings = require( './settings' ).settings;

// Get classes
var PP_Responses = require( './classes/pp_response');
var PP_SimpleErrorResponse = PP_Responses.PP_SimpleErrorResponse;

// Get helpers
var util = require( 'util' );

function log(message){
	if( settings.debug ) {
		console.log(message);
	}
}

function log_o(obj, depth){
	if( settings.debug ){
		if( !depth ) {
			depth = null;
		}
		console.log( util.inspect( obj, { depth: depth } ) );
	}
}

// Get and setup WebSocketServer
var WebSocketServer = require( 'ws' ).Server;
var wss = new WebSocketServer( {
   host: settings.host,
   port: settings.port
} );

var PP_Controller = require('./pp_controller' ).PP_Controller;

var controller = new PP_Controller(wss);

// Listen and respond
wss.on( 'connection', function( ws ) {
	ws.on( 'message', function( message ) {
		try {
			message = JSON.parse( message );

			console.log( util.inspect( message, { depth: null } ) );
			var action = 'do_' + message.event;
			console.log('Action: ' + action);
			// All properties do_foo on the controller should be functions which take the ws and message and return boolean
			// The actions should send any response they want to send themselves, unless they simply want a failed event returned
			// Bit of a dirty hack, but works
			if( typeof controller[action] === 'function' ) {
				console.log('action found');
				if( ! controller[ action ]( ws, message.data ) ) {
					// Action failed.  Return error
					controller.send_message(ws, new PP_SimpleErrorResponse( message.event, 'Action ' + message.event + ' failed' ) );
				}
			} else {
				// Action not found.  Return error
				controller.send_message(ws, new PP_SimpleErrorResponse( 'UNKNOWN ACTION', 'Action ' + message.event + ' not found' ) );
			}

		} catch( e ) {
			try {
				console.log( 'EXCEPTON: ' + util.inspect( e ) );
				controller.send_message(ws, new PP_SimpleErrorResponse( 'EXCEPTON',  e.message ) );
			} catch( e ) {
				console.log( 'EXCEPTON: ' + util.inspect( e ) );
			}
		}
	} );
} );

