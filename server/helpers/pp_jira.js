"use strict";

// Get config
var settings = require( '../settings' ).settings;

var PP_Logger = require( './pp_logger').PP_Logger;
var logger = new PP_Logger;

/**
 * Class to interface with Jira
 *
 * @constructor
 */
function PP_Jira(){
	// Set base URL
	this._jira_base_url = '' + settings.jira_url;
	// Ensure ends in slash
	if( this._jira_base_url.slice(-1) !== '/' ){
		this._jira_base_url += '/';
	}
	// Set link URL
	this._jira_link_url = this._jira_base_url ? this._jira_base_url + 'browse/' : false;

	// Create request object with default settings
	this._request = require('request').defaults({
		baseUrl: this._jira_base_url + 'rest/api/2/',
		json: true,
        jar: true
    });

	this._username = false;
	this._dispname = false;
	this._post_callback = false;
	this._request_in_progress = false;
	this._message = '';
	this._logged_in = false;
}

PP_Jira.prototype.get_username = function(){
	return this._username;
};
PP_Jira.prototype.get_dispname = function(){
	return this._dispname;
};
PP_Jira.prototype.is_logged_in = function(){
	return this._logged_in;
};
PP_Jira.prototype.get_message = function(){
	return this._message;
};
PP_Jira.prototype.is_request_in_progress = function(){
	return this._request_in_progress;
};

/**
 * Gets the URL for linking to a Jira issue
 *
 * @returns {string|boolean}
 */
PP_Jira.prototype.get_jira_link_url = function(issue_id){
	return this._jira_link_url && issue_id ? this._jira_base_url + issue_id : false;
};

/**
 * Internal function to make get requests
 *
 * @param service string The service to call (url fragment)
 * @param data object Data to append as query string
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param callback function Callback function to process data
 * @private
 */
PP_Jira.prototype._get = function(service, data, callback, username, password) {
	// Options for request
	var opts = {
		url: '/' + service,
		method: 'GET'
	};

	// If we have data add to the request
	if( data ) {
		opts.qs = data;
	}

	// If we have a username then log in.  Otherwise assume a session
	if( username ){
		opts.auth = {
			'user': username,
			'pass': password,
			'sendImmediately': true
		};
	}

	// Save this as a variable then wrap callback in an anonymous function in order to add the jira param
	var jira = this;

	// Run request
	this._request_in_progress = true;
	this._request(opts, function(error, response, body){
		callback.call(this, error, response, body, jira);
	});
};

/**
 * Authenticates the user and creates a session
 *
 * @param username string
 * @param password string
 */
PP_Jira.prototype.authenticate = function(username, password, callback){
	this._post_callback = callback;
	this._username = username;

	// Run request
	this._get( 'myself', false, this._authentication_callback, username, password);
};

/**
 * Callback run when authentication response is received.
 *
 * Note: This is a callback, so this inside this function refers to the *request* object,
 * not the PP_Jira object.  The PP_Jira object is passed in as a function.
 *
 * @param error {} Error object from request
 * @param response http.IncomingMessage response object
 * @param body {} The body object returned
 * @param jira PP_Jira the calling object
 * @private
 */
PP_Jira.prototype._authentication_callback = function(error, response, body, jira){
	jira._logged_in = false;
	jira._dispname = false;
	switch( response.statusCode ){
		case 200:
			if( body.active ){
				jira._logged_in = true;
				jira._message = 'Login Succeeded';
				jira._dispname = body.displayName;
			}
			break;
		case 401:
			jira._message = 'Login Failed';
			break;
		case 403:
			jira._message = 'Login attempt refused';
			break;
		case 404:
			jira._message = 'Authentication succeeded but user not found!';
			break;
		default:
			jira._message = 'Login Failed with code ' + response.statusCode + ' ' + response.statusText;
			break;
	}

	if( typeof jira._post_callback === 'function' ) {
		jira._post_callback(jira, body);
		jira._post_callback = false;
	}
};

/**
 * Gets info on an issue
 *
 * @param issue_id string The Jira ID of the issue
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param callback function Callback function to process data
 */
PP_Jira.prototype.get_issue = function(issue_id, data, callback){
	this._get('issue/' + issue_id, data, callback, false, false);
};


module.exports = {
	PP_Jira: PP_Jira
};
