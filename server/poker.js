"use strict";

// Get config
var settings = require( './settings' ).settings;

// Get classes
var PP_SimpleErrorResponse = require( './classes/pp_response' ).PP_SimpleErrorResponse;
var WebSocketServer = require( 'ws' ).Server;
var PP_Controller = require( './pp_controller' ).PP_Controller;

// Get helpers
var PP_Logger = require( './helpers/pp_logger' ).PP_Logger;
var logger = new PP_Logger;
var fs = require('fs');
var httpServ = ( settings.ssl ) ? require('https') : require('http');


// dummy request processing
var processRequest = function( req, res ) {

	res.writeHead(200);
	res.end("Move along now, nothing to see here!\n");
};

// Create server
var app = null;
if( settings.ssl ){
	app = httpServ.createServer({
		// providing server with  SSL key/cert
		key: fs.readFileSync( settings.ssl_key ),
		cert: fs.readFileSync( settings.ssl_cert )

	}, processRequest ).listen( settings.port );
} else {
	app = httpServ.createServer( processRequest ).listen( settings.port );
}

// Pass in a reference to web server so WS would knows port and SSL capabilities
var wss = new WebSocketServer( { server: app } );

// Get controller
var controller = new PP_Controller(wss);

// Listen and respond
wss.on( 'connection', function( ws ) {
	ws.on( 'message', function( message ) {
		try {
			message = JSON.parse( message );

			var action = 'do_' + message.event;
			// All properties do_foo on the controller should be functions which take the ws and message and return boolean
			// The actions should send any response they want to send themselves, unless they simply want a failed event returned
			// Bit of a dirty hack, but works
			if( typeof controller[action] === 'function' ) {
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
				logger.log( 'EXCEPTON: ' );
				logger.log_o( e );
				controller.send_message(ws, new PP_SimpleErrorResponse( 'EXCEPTON',  e.message ) );
			} catch( e ) {
				logger.log( 'EXCEPTON: ' );
				logger.log_o( e );
			}
		}
	} );
} );

