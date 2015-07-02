"use strict";

// Get classes
var PP_Responses = require( './classes/pp_response');
var PP_SuccessResponse = PP_Responses.PP_SuccessResponse;
var PP_ListResponse = PP_Responses.PP_ListResponse;
var PP_Exceptions = require( './classes/pp_exceptions')
var PP_MeetingNotFoundException = PP_Exceptions.PP_MeetingNotFoundException;
var PP_Exception = PP_Exceptions.PP_Exception;

var PP_Meeting = require( './classes/pp_meeting').PP_Meeting;
var PP_Player = require( './classes/pp_player').PP_Player;

// Get helpers
var PP_Logger = require( './helpers/pp_logger').PP_Logger;
var logger = new PP_Logger

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
PP_Controller.prototype.do_refresh = function(ws, data) {
	for( var m in this._meetings ){
		this._meetings[m ].update_all_with_status(true, 'refresh');
	}
};

PP_Controller.prototype.do_create_meeting = function(ws, data){
	var meeting = new PP_Meeting(ws, data.player_name, data.meeting_name);
	logger.log_o( this._meetings );
	this._meetings[ meeting.get_id() ] = meeting;
	logger.log('meeting added');
	meeting.update_all_with_status(true, 'meeting_created');
	this.broadcast( this._get_meetings_list_response() );
	return true;
};

PP_Controller.prototype.do_end_meeting = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player_id = data.player_id;

	var meeting = this._get_meeting(meeting_id, 'join_meeting');
	meeting.end(player_id);
	delete this._meetings[meeting_id];

	return true;
};

PP_Controller.prototype.do_set_issue = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player_id = data.player_id;
	var meeting = this._get_meeting(meeting_id, 'set_issue');

	var issue_id = data.issue_id;
	var method = data.issue_set_method;

	switch( method ) {
		case 'fetch_from_jira':
			meeting.set_issue_from_jira(player_id, issue_id);
			break;
		case 'add_jira_link':
			meeting.set_issue_with_jira_link(player_id, issue_id, data.issue_name, data.issue_desc);
			break;
		case 'manual':
			meeting.set_issue(player_id, issue_id, data.issue_name, data.issue_desc, data.issue_link);
			break;
		default:
			throw new PP_Exception('Issue Set Method ' + method + ' not recognised');
	}

	return true;
};

PP_Controller.prototype.do_show_cards = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player_id = data.player_id;
	var meeting = this._get_meeting(meeting_id, 'show_cards');

	meeting.set_show_cards(player_id, true);
	return true;
};

PP_Controller.prototype.do_list_meetings = function(ws, data){

	this.send_message( ws, this._get_meetings_list_response()  );

	return true;
};

PP_Controller.prototype.do_join_meeting = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player_name = data.player_name;
	var player_id = data.player_id;

	var meeting = this._get_meeting(meeting_id, 'join_meeting');
	meeting.join( ws, player_name, player_id);
	if( player_id ) {
		// Leave any other meetings
		for( var m in this._meetings ) {
			if( m !== meeting_id && this._meetings[ m ].has_player(player_id) ) {
				this._meetings[ m ].leave(player_id);
			}
		}
	}

	return true;
};

PP_Controller.prototype.do_leave_meeting = function(ws, data) {
	var meeting_id = data.meeting_id;
	var player_id = data.player_id;

	var meeting = this._get_meeting(meeting_id, 'leave_meeting');
	// Leave meeting.  This will inform everyone else
	meeting.leave(player_id);
	// Inform the person themselves that it has succeeded
	this.send_message(ws, new PP_SuccessResponse('left_meeting', null, false, false))

	return true;
};

PP_Controller.prototype.do_set_bid = function(ws, data) {
	logger.log('Setting bid');
	logger.log_o( data );
	logger.log('');
	var meeting_id = data.meeting_id;
	var player_id = data.player_id;
	logger.log(meeting_id + ' / ' + player_id);
	var meeting = this._get_meeting(meeting_id, 'set_bid');
	logger.log('got meeting');
	meeting.set_bid(player_id, data.bid);

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
