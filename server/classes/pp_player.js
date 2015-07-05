"use strict";
/**
 * Class for a player in the meeting
 * @param ws websocket The connection for the player
 * @param id The ID for the player
 * @param name The name of the player
 * @constructor
 */
function PP_Player(ws, id, name) {
	this._id = id;
	this._ws = ws;
	this._name = name;
	this._bid = false;
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



module.exports = {
	PP_Player: PP_Player

};
