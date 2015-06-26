"use strict";

/**
 * Base response class
 * @param success boolean Did the action succeeed
 * @param action string Action to send
 * @param data object Data to return
 * @param errors object Details of the errors encountered
 * @param player_id string ID of the player
 * @param meeting_id string ID of the meeting
 * @constructor
 */
function PP_Response(success, action, data, errors, player_id, meeting_id){
	this.success = success;
	this.action = action;
	this.data = data;
	this.player = player_id;
	this.meeting = meeting_id;

	if( errors ) {
		this.errors = errors;
	}

};

/**
 * Error response
 * @param action string Action to send
 * @param errors object Details of the errors encountered
 * @constructor
 */
function PP_ErrorResponse(action, errors){
	this.constructor.prototype.__proto__ = PP_Response.prototype;
	PP_Response.call(this, false, action, null, errors, false, false);
}

/**
 * A simplified error response for a single error
 * @param action string Action to send
 * @param error_text string A description of the error encountered
 * @constructor
 */
function PP_SimpleErrorResponse(action, error_text){
	this.constructor.prototype.__proto__ = PP_ErrorResponse.prototype;
	PP_ErrorResponse.call(this, action, { text: error_text });
}

/**
 * Success Response
 * @param action string Action to send
 * @param data object Data to return
 * @param player_id string ID of the player
 * @param meeting_id string ID of the meeting
 * @constructor
 */
function PP_SuccessResponse(action, data, player_id, meeting_id) {
	//this.constructor.prototype.__proto__ = PP_Response.prototype;
	PP_Response.call(this, true, action, data, false, player_id, meeting_id);
}

/**
 * List/Info response
 * @param action string Action to send
 * @param data object Data to return
 * @constructor
 */
function PP_ListResponse(action, data){
	this.constructor.prototype.__proto__ = PP_SuccessResponse.prototype;
	PP_SuccessResponse.call(this, action, data, false, false);
}

module.exports = {
	PP_Response: PP_Response,
	PP_ErrorResponse: PP_ErrorResponse,
	PP_SimpleErrorResponse: PP_SimpleErrorResponse,
	PP_SuccessResponse: PP_SuccessResponse,
	PP_ListResponse: PP_ListResponse
};
