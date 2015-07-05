"use strict";

var PP_Responses = require( './pp_response');
var PP_SuccessResponse = PP_Responses.PP_SuccessResponse;

var PP_Exceptions = require( '../helpers/pp_exceptions');
var PP_Exception = PP_Exceptions.PP_Exception;
var PP_PlayerNotFoundException = PP_Exceptions.PP_PlayerNotFoundException;
var PP_NotAuthorisedException = PP_Exceptions.PP_NotAuthorisedException;

var PP_Player = require( './pp_player').PP_Player;
var PP_Issue = require( './pp_issue' ).PP_Issue;

// Get helpers
var PP_Logger = require( '../helpers/pp_logger').PP_Logger;
var logger = new PP_Logger
var PP_Auth = require( '../helpers/pp_auth');


	/**
 * Class defining a meeting
 * @param host_ws websocket The connection for the person hosting the meeting
 * @param host_player PP_Player The player of the host
 * @param meeting_name string The name or title for the meeting
 * @constructor
 */
function PP_Meeting(host_ws, host_player, meeting_name) {
	this._id = PP_Auth.createGUID();
	this._name = meeting_name;
	this._players = {};
	this._show_cards = false;
	/**
	 *
	 * @type PP_Issue
	 */
	this._issue = false;

	this._players[ host_player.get_id() ] = host_player;
	this._host = host_player.get_id();
}

/**
 * Ends the meeting by informing all players that it has ended.
 * The meeting should still be removed from the server!
 */
PP_Meeting.prototype.end = function(player) {
	this._check_if_host(player.get_id());
	this._id = false;
	// inform all players
	var data = {
		is_update: true,
		you_are_host: false,
		your_bid: false
	};
	for( var player_id in this._players ) {
		this._update( this._players[ player_id ].get_ws(),
		              true,
		              'end_meeting',
		              player_id,
		              data );
	}
};

/**
 * Adds a player to the meeting
 *
 * @param ws websocket The connection for the player
 * @param name string The name of the player
 * @param player PP_Player The player joining
 */
PP_Meeting.prototype.join = function(ws, player) {
	if( this._players.hasOwnProperty(player.get_id()) ) {
		throw new PP_Exception('Player already in meeting');
	}

	this._players[ player.get_id() ] = player;
	this.update_all_with_status(true, 'player_joined', '' + player.get_name() + ' has joined the this.');
};

/**
 * Removes a single player from the meeting
 * @param player_id string
 */
PP_Meeting.prototype.leave = function(player) {
	if( player.get_id() === this._host ){
		throw new PP_Exception('The host cannot leave the meeting!  You can only end it...');
	}
	if( !this._players.hasOwnProperty(player.get_id()) ) {
		throw new PP_Exception('You cannot leave a meeting you are not in!');
	}
	var player_name = player.get_name();
	delete this._players[player.get_id()];
	this.update_all_with_status(true, 'update', player_name + ' has left the meeting');

};

PP_Meeting.prototype.set_bid = function(player, bid, issue_id) {
	logger.log('setting bid ' + bid + ' for player ' + player.get_id());
	if( issue_id ){
		if( !this._issue || issue_id !== this._issue.id ) {
			throw new PP_Exception('issue has changed since bid made');
		}
	}
	var player_meeting = this._get_player(player.get_id());
	player_meeting.set_bid(bid);
	this.update_all_with_status(true, 'player_bid', false);
};

/**
 * Sets the current _issue
 *
 * @param player_id string The player making the change
 * @param id string The ID of the _issue
 * @param name string The name of thr _issue
 * @param description string The description of the _issue
 * @param link string A link to the _issue
 */
PP_Meeting.prototype.set_issue = function( player, id, name, description, link ) {
	this._check_if_host(player.get_id());
	this._issue = new PP_Issue(id, name, description, link);
	this._new_issue_set();
};

/**
 * Sets the current _issue, setting the link to Jira automatically based on the ID
 *
 * @param player_id string The player making the change
 * @param id string The ID of the _issue
 * @param name string The name of thr _issue
 * @param description string The description of the _issue
 */
PP_Meeting.prototype.set_issue_with_jira_link = function( player, id, name, description ) {
	this._check_if_host(player.get_id());
	this._issue = new PP_Issue(id, name, description, false);
	this._issue.set_jira_link_from_id();
	this._new_issue_set();
};

/**
 * Sets the current _issue, fetching all info on the _issue from Jira
 *
 * @param player_id string The player making the change
 * @param id string The ID of the _issue
 */
PP_Meeting.prototype.set_issue_from_jira = function( player, id ) {
	this._check_if_host(player.get_id());
	this._issue = new PP_Issue();
	this._issue.set_from_jira(id);
	this._new_issue_set();
};

/**
 * Sets the value of the Show Cards property and updates the status for everyone.
 *
 * Can only be done by the host
 *
 * @param player_id string The player making the change
 * @param show_cards boolean The value to set.
 */
PP_Meeting.prototype.set_show_cards = function(player, show_cards) {
	this._check_if_host(player.get_id());
	if( show_cards ){
		this._show_cards = true;
		this.update_all_with_status(true, 'cards_shown', 'Cards have been shown');
	} else {
		this._show_cards = true;
		this.update_all_with_status(true, 'cards_hidden', 'Cards have been hidden');
	}
};


/**
 * Sends an update to all players with the new status
 * @param success boolean Whether the last action succeeded or not
 * @param action string The action to return
 */
PP_Meeting.prototype.update_all_with_status = function(success, action, notice){
	logger.log('update_all_with_status for ' + action);
	var resp = this._get_status_update_response();
	if( notice ) {
		resp.notice = notice;
	}
	this.update_all(success, action, resp);
};

/**
 * Sends an update to all players
 * @param success boolean Did the action success
 * @param action string The action to send in the update
 * @param data {} The data to send with the update
 */
PP_Meeting.prototype.update_all = function(success, action, data){
	if( !data ){
		data = {};
	}
	for( var player_id in this._players ) {
		if( success ) {
			if( this._host ){
				logger.log(player_id);
				logger.log(this._host);
				data.you_are_host = (player_id === this._host);
			}
			data.your_bid = this._players[ player_id ].get_bid();
		}
		this._update( this._players[ player_id ].get_ws(),
	                  success,
	                  action,
	                  player_id,
	                  data );
	}
};


/**
 * Returns the ID for the meeting
 *
 * @returns {boolean|string}
 */
PP_Meeting.prototype.get_id = function() {
	return this._id;
};

/**
 * Returns the name for the meeting
 *
 * @returns {boolean|string}
 */
PP_Meeting.prototype.get_name = function() {
	return this._name;
};

/**
 * Returns the name of the host for the meeting
 *
 * @returns {boolean|string}
 */
PP_Meeting.prototype.get_host_name = function() {
	logger.log('get_host_name');
	logger.log(this._host);
	if( this._host && this._players[ this._host ] ) {
		logger.log('found host');
		return this._players[ this._host ].get_name();
	} else {
		return false;
	}
};

/**
 * Checks if the supplied player is the host and throws an exception if they are not
 *
 * @param player_id
 * @private
 */
PP_Meeting.prototype._check_if_host = function(player_id) {
	if( !player_id || player_id !== this._host ) {
		throw new PP_NotAuthorisedException('Only the host may do that!');
	}
};


/**
 * Gets the specified player
 *
 * @param player_id string The players ID
 * @returns PP_Player
 * @private
 */
PP_Meeting.prototype._get_player = function(player_id) {
	if( player_id && this._players[ player_id ] ) {
		return this._players[ player_id ];
	} else {
		logger.log('player not found');
		logger.log_o( this._players, 3 );
		throw new PP_PlayerNotFoundException('Player is not part of this meeting');
	}
}

/**
 * Gets an object describing the current players in the meeting
 * Used as part of status responses
 *
 * @returns {{}}
 * @private
 */
PP_Meeting.prototype._get_players_for_response = function(){
	var players = [];
	for( var player_id in this._players ) {
		players.push({
			name: this._players[ player_id ].get_name(),
			bid: this._players[ player_id ].get_bid()
		});
	}
	return players;
};

PP_Meeting.prototype.has_player = function(player_id) {
	return this._players && this._players[player_id];
};

PP_Meeting.prototype.is_host = function(player){
	return player && this._host === player.get_id();
}

/**
 * Generates a status update response body
 * @returns {{meeting: string, host: string, players: {}, _issue: {}}}
 * @private
 */
PP_Meeting.prototype._get_status_update_response = function(){
	return {
		is_update: true,
		meeting: this._name,
		host: this._players[ this._host ].get_name(),
		players: this._get_players_for_response(),
		issue: this._issue ? this._issue.get_info_for_response() : null,
		show_cards: this._show_cards ? true : false
	};
};

/**
 * Sends an update to a single player
 * @param ws websocket The connection for the player to update
 * @param success boolean Did the action success
 * @param action string The action to send in the update
 * @param player_id The ID of the player to update
 * @param data {} The data to send with the update
 * @private
 */
PP_Meeting.prototype._update = function(ws, success, action, player_id, data){
	try{
		logger.log('sending update for ' + player_id);

		var message = new PP_SuccessResponse(action, data, player_id, this.get_id());
		logger.log_o( message );
		ws.send( JSON.stringify(message) );

	}catch( e ) {
		logger.log( 'EXCEPTON: ' );
		logger.log_o( e );
	}
};


/**
 * Cleanup action after _issue has been changed
 *
 * Resets bids and sends update
 * @private
 */
PP_Meeting.prototype._new_issue_set = function(){
	this._show_cards = false;
	for( var player_id in this._players ) {
		this._players[ player_id ].set_bid(false);
	}

	this.update_all_with_status(true, 'new_issue', 'Issue Changed')
};


module.exports = {
	PP_Meeting: PP_Meeting
};
