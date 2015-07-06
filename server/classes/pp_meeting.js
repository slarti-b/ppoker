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
var PP_Jira = require( '../helpers/pp_jira').PP_Jira;


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

PP_Meeting.prototype.set_ws_for_player = function(player, ws){
	if( this._players[player.get_id()] ){
		this._players[ player.get_id() ].set_ws(ws);
	}
};

PP_Meeting.prototype.set_bid = function(player, bid, issue_id) {
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
	var jira = new PP_Jira();
	var data = {
		fields: 'issuetype,parent,project,priority,issuelinks,status,components,description,attachment,summary,reporter,subtasks'
	};
	var args = {
		player: player,
		issue_id: id,
		meeting: this
	};
	jira.get_issue(id, data, this._post_set_issue_from_jira, args);
};

PP_Meeting.prototype._post_set_issue_from_jira = function(error, response, body, jira){
	logger.log('_post_set_issue_from_jira');
	logger.log_o(jira.get_callback_args(), 2);
	logger.log_o(body);
	var args = jira.get_callback_args();
	var player = args.player;
	var meeting = args.meeting;
	var fields = body.fields;
	var issue = new PP_Issue( body.key,
	                          fields.summary,
	                          jira.format_string_as_html( fields.description ),
	                          jira.get_link_for_issue( body.key ) );
	issue.extended_info = true;
	if( fields.issuetype ){
		issue.type_name = fields.issuetype.name;
		issue.type_icon = fields.issuetype.iconUrl;
	}
	if( fields.parent && fields.parent.key ){
		issue.parent_id = fields.parent.key;
		issue.parent_name = fields.parent.fields.summary;
		if( fields.parent.fields.issuetype ){
			issue.parent_type = fields.parent.fields.issuetype.name;
			issue.parent_type_icon = fields.parent.fields.issuetype.iconUrl;
		}
		issue.parent_link = jira.get_link_for_issue(issue.parent_id);
	}
	if( fields.project ){
		issue.project_name = fields.project.name;
	}
	if( fields.priority ){
		issue.prio_id = fields.priority.id;
		issue.prio_name = fields.priority.name;
		issue.prio_icon = fields.priority.iconUrl;
	}
	if( fields.status ){
		issue.status_name = fields.status.name;
		issue.status_icon = fields.status.iconUrl;
	}
	if( fields.reporter ){
		issue.reporter_name = fields.reporter.displayName;
	}

	if( fields.attachment ){
		var attachments = [];
		for( var i in fields.attachment ){
			attachments.push({
                name: fields.attachment[ i ].filename,
				url: fields.attachment[ i ].content,
                thumbnail: fields.attachment[ i ].thumbnail
            });
		}
		if( attachments.length ){
			issue.attachments = attachments;
		}
	}

	if( fields.issuelinks ){
		var links = [];
		for( var i in fields.issuelinks ){
			var link = fields.issuelinks[ i ];
			var link_type = false;
			var link_data = false;
			if( link.outwardIssue ){
				link_type = link.type.outward;
				link_data = link.outwardIssue;
			} else if( link.inwardIssue ) {
				link_type = link.type.inward;
				link_data = link.inwardIssue;
			}
			if( link_data ){
				links.push({
					type: link_type,
					id: link_data.key,
					url: jira.get_link_for_issue(link_data.key),
					name: link_data.fields.summary
	            });
			}
		}
		if( links.length ){
			issue.links = links;
		}
	}
	if( fields.subtasks ){
		issue.num_subtasks = fields.subtasks.length;
	} else {
		issue.num_subtasks = 0;
	}
	logger.log_o(issue);
	meeting._issue = issue;
	meeting._new_issue_set();

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
	if( this._host && this._players[ this._host ] ) {
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
		var message = new PP_SuccessResponse(action, data, player_id, this.get_id());
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
