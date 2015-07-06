"use strict";

// Get config
var settings = require( '../settings' ).settings;

var PP_Exceptions = require( './pp_exceptions');
var PP_Logger = require( './pp_logger').PP_Logger;
var logger = new PP_Logger;

/**
 * Class to interface with Jira
 *
 * @constructor
 */
function PP_Jira(){
	/**
	 * Base URL for the Jira installation
	 * @type {string}
	 * @private
	 */
	this._jira_base_url = '' + settings.jira_url;
	// Ensure ends in slash
	if( this._jira_base_url.slice(-1) !== '/' ){
		this._jira_base_url += '/';
	}
	/**
	 * Base URL for links to Jira tasks
	 * @type {string}
	 * @private
	 */
	this._jira_link_url = this._jira_base_url ? this._jira_base_url + 'browse/' : false;

	/**
	 * Request object.  With some defaults set
	 * @type {request}
	 * @private
	 */
	this._request = require('request').defaults({
		baseUrl: this._jira_base_url + 'rest/api/2/',
		json: true,
        jar: true
    });

	this._callback_args = false;
	/**
	 * Username of the logged in user
	 * @type {string}
	 * @private
	 */
	this._username = '';
	/**
	 * Display name of the logged in user
	 * @type {string}
	 * @private
	 */
	this._dispname = '';
	/**
	 * Extra callback run after built-in callbacks
	 * Gets the current PP_Jira object and the response body as paramters
	 * @type {function|boolean}
	 * @private
	 */
	this._post_callback_callback = false;
	/**
	 * Marker to avoid double simultaneous request
	 * @type {boolean}
	 * @private
	 */
	this._request_in_progress = false;
	/**
	 * Message set by built-in callback
	 * @type {string}
	 * @private
	 */
	this._message = '';
	/**
	 * Is the user currently logged in
	 * @type {boolean}
	 * @private
	 */
	this._logged_in = false;
}

/**
 * Get the username of the currently logged in user
 * @returns {string}
 */
PP_Jira.prototype.get_username = function(){
	return this._username;
};
/**
 * Get the display name of the currently logged in user
 * @returns {string}
 */
PP_Jira.prototype.get_dispname = function(){
	return this._dispname;
};
/**
 * Returns whether or not a user is currently logged in
 * @returns {boolean}
 */
PP_Jira.prototype.is_logged_in = function(){
	return this._logged_in;
};
/**
 * Gets the message set by the built-in callbacks
 * @returns {string}
 */
PP_Jira.prototype.get_message = function(){
	return this._message;
};

/**
 * Gets the URL for linking to a Jira issue
 *
 * @returns {string|boolean}
 */
PP_Jira.prototype.get_jira_link_url = function(issue_id){
	return this._jira_link_url && issue_id ? this._jira_link_url + issue_id : false;
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

	if( this._request_in_progress ){
		throw new PP_Exceptions.PP_Exception('Request already in progress');
	}

	// Run request
	this._request_in_progress = true;
	this._message = '';
	this._request(opts, function(error, response, body){
		// If we have a username assume we are logging in.  In this case the authentication routine handles the response
		// Otherwise fail if 401 returned
		if( !username && response.statusCode === 401 ){
			throw new PP_Exceptions.PP_NotAuthorisedException('You must log in to complete that action');
		}
		// Request complete
		jira._request_in_progress = false;
		// Call callback
		callback.call(this, error, response, body, jira);
	});
};

/**
 * Authenticates the user and creates a session
 *
 * @param username string
 * @param password string
 */
PP_Jira.prototype.authenticate = function(username, password, callback, args){
	this._post_callback_callback = callback;
	this._username = username;
	this._callback_args = args;

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
	jira._dispname = '';
	if( response && response instanceof Object && response.hasOwnProperty('statusCode') ) {
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
	} else {
		jira._message = 'Login failed (no response received)';
	}

	if( typeof jira._post_callback_callback === 'function' ) {
		jira._post_callback_callback(jira, body, jira._callback_args);
		jira._post_callback_callback = false;
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

/**
 * Gets a link to the specified issue in Jira
 * No check that the issue exists is performed!
 * @param issue_id string
 * @returns {string}
 */
PP_Jira.prototype.get_link_for_issue = function(issue_id){
	return this._jira_link_url + issue_id;
};


module.exports = {
	PP_Jira: PP_Jira
};
