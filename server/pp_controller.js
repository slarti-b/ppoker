"use strict";

// Get classes
var PP_Responses = require( './classes/pp_response');
var PP_SuccessResponse = PP_Responses.PP_SuccessResponse;
var PP_ListResponse = PP_Responses.PP_ListResponse;
var PP_Exceptions = require( './helpers/pp_exceptions');
var PP_MeetingNotFoundException = PP_Exceptions.PP_MeetingNotFoundException;
var PP_Exception = PP_Exceptions.PP_Exception;

var PP_Meeting = require( './classes/pp_meeting').PP_Meeting;
var PP_Player = require( './classes/pp_player').PP_Player;

// Get helpers
var PP_Logger = require( './helpers/pp_logger').PP_Logger;
var logger = new PP_Logger;
var PP_Auth = require( './helpers/pp_auth');

// Get config
var settings = require( './settings' ).settings;


/**
 * Main controller
 * @param wss WebSocketServer The server used for communication
 * @constructor
 */
function PP_Controller(wss){
	this._meetings = {};
	this.all_clients = wss.clients;
	this._players = {};
}

PP_Controller.prototype.do_connect = function(ws, data){
	var player = this._get_player_from_data(data);
	return true;
};

PP_Controller.prototype.do_logout = function(ws, data){
	var player = this._get_player_from_data(data);
	for( var m in this._meetings ){
		if( this._meetings[m ].has_player(player.get_id()) ){
			if( this._meetings[m ].is_host(player) ){
				this._meetings[m ].end(player);
			} else {
				this._meetings[m ].leave(player);
			}
		}
	}
	delete this._players[ player.get_id() ];
	var message = new PP_SuccessResponse('logout', {is_update: true}, false, null);
	logger.log_o( message );
	ws.send( JSON.stringify(message) );
	return true;
};

PP_Controller.prototype.do_login = function(ws, data) {
	if( data.play_as_guest ) {
		if( true !== settings.allow_guest ) {
			throw new PP_Exceptions.PP_NotAuthorisedException('Guest play has been disabled.  Please log in');
		} else {
			var player = new PP_Player( ws, PP_Auth.createGUID(), data.player_name );
			this._players[ player.get_id() ] = player;
			var data = {
				logged_in: true,
				authenticated_user: false,
				player_dispname: player.get_name(),
				avatar: ''
			};
			var message = new PP_SuccessResponse('login', data, player.get_id(), null);
			logger.log_o( message );
			ws.send( JSON.stringify(message) );
			return true;
		}
	} else {
		PP_Auth.login(data.username, data.password, this._post_login);
		return true;
	}
};

PP_Controller.prototype._post_login = function(jira, body){

};

PP_Controller.prototype.do_refresh_all = function(ws, data) {
	for( var m in this._meetings ){
		this._meetings[ m ].update_all_with_status(true, 'refresh');
	}
};

PP_Controller.prototype._get_player = function(player_id){
	if( player_id && this._players.hasOwnProperty(player_id) ){
		return this._players[ player_id ];
	}

	throw new PP_Exceptions.PP_NotLoggedInException('You must log in first');
};

PP_Controller.prototype._get_player_from_data = function(data) {
	return this._get_player( data.player_id );
};


PP_Controller.prototype.do_create_meeting = function(ws, data){
	var player = this._get_player_from_data( data );
	var meeting = new PP_Meeting(ws, player, data.meeting_name);
	this._meetings[ meeting.get_id() ] = meeting;
	meeting.update_all_with_status(true, 'meeting_created');
	this.broadcast( this._get_meetings_list_response() );
	return true;
};

PP_Controller.prototype.do_end_meeting = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player = this._get_player_from_data(data);

	var meeting = this._get_meeting(meeting_id, 'end_meeting');
	meeting.end(player);
	delete this._meetings[meeting_id];
	this.broadcast( this._get_meetings_list_response() );
	return true;
};

PP_Controller.prototype.do_set_issue = function(ws, data) {
	var player = this._get_player_from_data(data);
	var meeting = this._get_meeting_from_data(data, 'set_issue');

	var issue_id = data.issue_id;
	var method = data.issue_set_method;

	switch( method ) {
		case 'fetch_from_jira':
			meeting.set_issue_from_jira(player, issue_id);
			break;
		case 'add_jira_link':
			meeting.set_issue_with_jira_link(player, issue_id, data.issue_name, data.issue_desc);
			break;
		case 'manual':
			meeting.set_issue(player, issue_id, data.issue_name, data.issue_desc, data.issue_link);
			break;
		default:
			throw new PP_Exception('Issue Set Method ' + method + ' not recognised');
	}

	return true;
};

PP_Controller.prototype.do_show_cards = function(ws, data) {
	var player = this._get_player_from_data(data);
	var meeting = this._get_meeting_from_data(data, 'show_cards');

	meeting.set_show_cards(player, true);
	return true;
};

PP_Controller.prototype.do_list_meetings = function(ws, data){

	this.send_message( ws, this._get_meetings_list_response()  );

	return true;
};

PP_Controller.prototype.do_join_meeting = function(ws, data) {

	var meeting = this._get_meeting_from_data(data, 'join_meeting');
	var player = this._get_player_from_data(data);

	if( player ) {
		meeting.join( ws, player );
		// Leave any other meetings
		var player_id = player.get_id();
		for( var m in this._meetings ) {
			if( m !== meeting_id && this._meetings[ m ].has_player(player_id) ) {
				this._meetings[ m ].leave(player_id);
			}
		}
	}

	return true;
};

PP_Controller.prototype.do_leave_meeting = function(ws, data) {
	var player = this._get_player_from_data(data);

	var meeting = this._get_meeting_from_data(data, 'leave_meeting');
	// Leave meeting.  This will inform everyone else
	meeting.leave(player);
	// Inform the person themselves that it has succeeded
	this.send_message(ws, new PP_SuccessResponse('left_meeting', null, false, false))

	return true;
};

PP_Controller.prototype.do_set_bid = function(ws, data) {
	var meeting = this._get_meeting_from_data(data, 'set_bid');
	var player = this._get_player_from_data(data);
	logger.log('got meeting');
	meeting.set_bid(player, data.bid);

	return true;
};

/**
 * Get the specified meeting from the meeting list
 *
 * @param meeting_id string The meeting ID
 * @param action string The action to reference in the error if meeting is not found
 * @returns PP_Meeting
 * @throws PP_MeetingNotFoundException
 * @private
 */
PP_Controller.prototype._get_meeting = function(meeting_id, action) {
	if( meeting_id && this._meetings.hasOwnProperty(meeting_id) ) {
		return this._meetings[meeting_id];
	} else {
		throw new PP_MeetingNotFoundException('Meeting does not exist in action ' + action);
	}
};

PP_Controller.prototype._get_meeting_from_data = function(data, action){
	return this._get_meeting(data.meeting_id, action);
}

PP_Controller.prototype.send_message = function(ws, response) {
	logger.log_o( response, 3 );
	ws.send( JSON.stringify( response ) );
};

PP_Controller.prototype._get_meetings_list_response = function(){
	var list = [];
	for( var meeting_index in this._meetings ) {
		var meeting = this._meetings[ meeting_index ];
		/* @type meeting PP_Meeting */
		list.push( {
			           id: meeting.get_id(),
			           name: meeting.get_name(),
			           host: meeting.get_host_name()
		           });
	}
	return new PP_ListResponse( 'meetings_list', list );
};

PP_Controller.prototype.broadcast = function(data){
	for( var i in this.all_clients ) {
		this.send_message( this.all_clients[ i ], data );
	}
};

module.exports = {
	PP_Controller: PP_Controller
};
