"use strict";

var PP_Responses = require( './pp_response');

/**
 * Class for a player in the meeting
 * @param ws websocket The connection for the player
 * @param id The ID for the player
 * @param name The name of the player
 * @constructor
 */
function PP_Player(ws, id, name, authenticated) {
	this._id = id;
	this._ws = ws;
	this._name = name;
	this._bid = false;
	this._authenticated = authenticated ? true : false;
}

/**
 * Gets the ID
 * @returns string
 */
PP_Player.prototype.get_id = function(){
	return this._id;
};

/**
 * Gets the Connection
 * @returns websocket
 */
PP_Player.prototype.get_ws = function(){
	return this._ws;
};

PP_Player.prototype.set_ws = function(ws) {
	return this._ws = ws;
}

/**
 * Gets the name
 * @returns string
 */
PP_Player.prototype.get_name = function(){
	return this._name;
};

/**
 * Gets the current bid
 * @returns number|false
 */
PP_Player.prototype.get_bid = function(){
	return this._bid;
};

/**
 * Sets the bid
 * @param bid number
 */
PP_Player.prototype.set_bid = function(bid){
	this._bid = bid;
};

/**
 *
 * @param meeting_id string
 * @returns {exports.PP_SuccessResponse}
 */
PP_Player.prototype.get_login_response = function(meeting_id){
	var data = {
		logged_in: true,
//		is_update: true,
		authenticated_user: this._authenticated,
		player_dispname: this.get_name()
	};
	return new PP_Responses.PP_SuccessResponse('login', data, this.get_id(), meeting_id);
};


module.exports = {
	PP_Player: PP_Player

};
