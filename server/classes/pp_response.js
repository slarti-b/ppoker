"use strict";

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

function PP_ErrorResponse(action, errors){
	this.constructor.prototype.__proto__ = PP_Response.prototype;
	PP_Response.call(this, false, action, null, errors, false, false);
}

function PP_SimpleErrorResponse(action, error_text){
	this.constructor.prototype.__proto__ = PP_ErrorResponse.prototype;
	PP_ErrorResponse.call(this, action, { text: error_text });
}

function PP_SuccessResponse(action, data, player_id, meeting_id) {
	//this.constructor.prototype.__proto__ = PP_Response.prototype;
	PP_Response.call(this, true, action, data, false, player_id, meeting_id);
}

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
