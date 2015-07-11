"use strict";

// Get classes
var PP_Responses = require( './classes/pp_response');
var PP_Exceptions = require( './helpers/pp_exceptions');
var PP_MeetingNotFoundException = PP_Exceptions.PP_MeetingNotFoundException;
var PP_Exception = PP_Exceptions.PP_Exception;

var PP_Meeting = require( './classes/pp_meeting').PP_Meeting;
var PP_Player = require( './classes/pp_player').PP_Player;

// Get helpers
var PP_Logger = require( './helpers/pp_logger').PP_Logger;
var logger = new PP_Logger;
var PP_Auth = require( './helpers/pp_auth');
var PP_Jira = require( './helpers/pp_jira').PP_Jira;

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
	this.avatars = {};
	this.icons = {
		issue_types: {

		},
		prios: {

		}
	};
}

PP_Controller.prototype.do_connect = function(ws, data){
	var player = this._get_player_from_data(data, true);
	// Set player id on client
	this.send_message(ws, new PP_Responses.PP_SuccessResponse('connect'))

	if( player ) {
		// Update player on server
		player.set_ws(ws);

		// See if we are in a meeting
		var found_meeting = false;
		for( var m in this._meetings ){
			if( this._meetings[ m ].has_player(player.get_id())){
				found_meeting = true;
				// Update client with meeting id
				this.send_message(ws, player.get_login_response(m) );
				// Update player in meeting on server
				this._meetings[ m ].set_ws_for_player(player, ws);
				// Update all in meeting
				this._meetings[ m ].update_all_with_status(true, 'reconnect')
				break;
			}
		}
		if( ! found_meeting ) {
			// Set meeting id null on client
			this.send_message(ws, player.get_login_response(null) );
		}

	} else {
		this.send_message(ws, new PP_Responses.PP_ErrorResponse('connect', 'Player not found'));
		this.do_list_meetings(ws, data);
	}

	// Send icons
	this.send_message( ws, this._get_update_icons_response() );
	// Send avatars
	for( var id in this.avatars ){
		this.send_avatars(id);
	}
	
	return true;
};

PP_Controller.prototype.do_login = function(ws, data) {
	if( data.play_as_guest ) {
		if( true !== settings.allow_guest ) {
			throw new PP_Exceptions.PP_NotAuthorisedException('Guest play has been disabled.  Please log in');
		} else {
			var player = new PP_Player( ws, PP_Auth.createGUID(), data.player_name, false );
			this._players[ player.get_id() ] = player;

			var message = player.get_login_response(null);
			ws.send( JSON.stringify(message) );
			return true;
		}
	} else {
		PP_Auth.login(data.username, data.password, this._post_login, {ws: ws, controller: this});
		return true;
	}
};

PP_Controller.prototype.do_get_icons = function(ws, data){
	logger.log('called do_get_icons');
	var jira = new PP_Jira;
	jira.get_issue_types(this._got_icons, {controller: this, ws: ws});
	jira.get_prios(this._got_icons, {controller: this, ws: ws});

};

PP_Controller.prototype._got_avatars = function( args ) {
	args.controller.send_avatars(args.id);
};

PP_Controller.prototype.send_avatars = function(id){
	if( this.avatars.hasOwnProperty(id) && this.avatars[id ].small && this.avatars[id ].large ) {
		this.broadcast( new PP_Responses.PP_SuccessResponse('add_avatar', this.avatars[id]) );
	}
};

PP_Controller.prototype._got_icons = function(args){
	logger.log('called _got_icons');
	logger.log_o(args, 1);
	var controller = args.controller;
	/**
	 * @type controller PP_Controller
	 */
	logger.log_o(controller.icons);

	if( controller._all_icons_fetched() ){
		controller.broadcast( controller._get_update_icons_response() );
	}
};

PP_Controller.prototype._all_icons_fetched = function(){
	var found_some = false;
	if( controller.icons.issue_types ){
		for( var id in controller.icons.issue_types ){
			if( controller.icons.issue_types[id] ) {
				found_some = true;
			} else {
				return false;
				break;
			}
		}
	}
	if( controller.icons.prios ){
		for( var id in controller.icons.prios ){
			if( controller.icons.prios[id] ) {
				found_some = true;
			} else {
				return false;
				break;
			}
		}
	}

	return found_some;
};

PP_Controller.prototype._get_update_icons_response = function(){
	return new PP_Responses.PP_SuccessResponse('update_jira_icons', this.icons);
};

/**
 *
 * @param jira {PP_Jira}
 * @param body {}
 * @param ws
 * @private
 */
PP_Controller.prototype._post_login = function(jira, body, args){
	var ws = args.ws;
	var controller = args.controller;
	if( jira.is_logged_in() ){
		var player = new PP_Player( ws, PP_Auth.createGUID(), body.displayName, true );
		controller._players[ player.get_id() ] = player;
		var message = player.get_login_response(null);
		controller.send_message(ws, message);
		controller.do_get_icons(ws, {});
		jira.get_avatars(controller._got_avatars,  body.avatarUrls, {controller: controller, ws: ws, id: body.key});
		return true;
	} else {
		var message = new PP_Responses.PP_ErrorResponse('login', jira.get_message());
		controller.send_message(ws, message);
	}
};


PP_Controller.prototype.do_logout = function(ws, data){
	logger.log('logging out');
	logger.log_o(data);
	var player = this._get_player_from_data(data);
	logger.log_o(player, 1);
	for( var m in this._meetings ){
		if( this._meetings[ m ].has_player(player.get_id()) ){
			logger.log(m);
			if( this._meetings[ m ].is_host(player) ){
				logger.log('ending meeting');
				this._end_meeting(player, m);
			} else {
				logger.log('leaving meeting');
				this._meetings[ m ].leave(player);
			}
		}
	}
	delete this._players[ player.get_id() ];
	var message = new PP_Responses.PP_SuccessResponse('logout', {is_update: true}, false, null);
	ws.send( JSON.stringify(message) );
	return true;
};

PP_Controller.prototype._end_meeting = function(player, meeting_id){
	var meeting = this._get_meeting(meeting_id, 'end_meeting');
	meeting.end(player);
	delete this._meetings[meeting_id];
	this.broadcast( this._get_meetings_list_response() );
};

PP_Controller.prototype.do_refresh_all = function(ws, data) {
	for( var m in this._meetings ){
		this._meetings[ m ].update_all_with_status(true, 'refresh');
	}
};

PP_Controller.prototype._get_player = function(player_id, test_only){
	if( player_id && this._players.hasOwnProperty(player_id) ){
		return this._players[ player_id ];
	}

	if( true === test_only ){
		return false
	} else {
		throw new PP_Exceptions.PP_NotLoggedInException('You must log in first');
	}
};

PP_Controller.prototype._get_player_from_data = function(data, test_only) {
	return this._get_player( data.player_id, test_only );
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

	this._end_meeting(player, meeting_id);
	return true;
};

PP_Controller.prototype.do_set_issue = function(ws, data) {
	var player = this._get_player_from_data(data);
	var meeting = this._get_meeting_from_data(data, 'set_issue');

	var issue_id = data.issue_id;
	var method = data.set_using;

	switch( method ) {
		case 'jira':
			meeting.set_issue_from_jira(player, issue_id);
			break;
		case 'jira_link':
			meeting.set_issue_with_jira_link(player, issue_id, data.issue_name, data.issue_desc);
			break;
		case 'manually':
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
	this.send_message(ws, new PP_Responses.PP_SuccessResponse('left_meeting', {is_update: true}, player.get_id(), false))

	return true;
};

PP_Controller.prototype.do_set_bid = function(ws, data) {
	var meeting = this._get_meeting_from_data(data, 'set_bid');
	var player = this._get_player_from_data(data);
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
	return new PP_Responses.PP_ListResponse( 'meetings_list', list );
};

PP_Controller.prototype.broadcast = function(data){
	for( var i in this.all_clients ) {
		this.send_message( this.all_clients[ i ], data );
	}
};

module.exports = {
	PP_Controller: PP_Controller
};
