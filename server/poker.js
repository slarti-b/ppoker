"use strict";

// Get config
var settings = require( './settings' ).settings;

// Get classes
var PP_Responses = require( './classes/pp_response');
var PP_SimpleErrorResponse = PP_Responses.PP_SimpleErrorResponse;

// Get helpers
var PP_Logger = require( './helpers/pp_logger').PP_Logger;
var logger = new PP_Logger;
var PP_Jira = require('./helpers/pp_jira').PP_Jira;
var jira = new PP_Jira;

jira.authenticate('', '', function(jira){
	if( jira.is_logged_in() ){
		jira.get_issue('WEB-301', {'fields': 'summary'}, function(error, response, body, jira){
			logger.log('');
			logger.log('got issue');
			logger.log(jira.get_dispname());
			logger.log('response');
			logger.log(response.statusCode);
			logger.log('body');
			logger.log_o(body, 3);
			logger.log('');
		});

	}
});


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

			logger.log_o( message );
			var action = 'do_' + message.event;
			logger.log('Action: ' + action);
			// All properties do_foo on the controller should be functions which take the ws and message and return boolean
			// The actions should send any response they want to send themselves, unless they simply want a failed event returned
			// Bit of a dirty hack, but works
			if( typeof controller[action] === 'function' ) {
				logger.log('action found');
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

