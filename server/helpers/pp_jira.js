"use strict";

// Get config
var settings = require( '../settings' ).settings;

var PP_Exceptions = require( './pp_exceptions');
var PP_Logger = require( './pp_logger').PP_Logger;
var logger = new PP_Logger;
var Autolinker = require( 'autolinker' );

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
	this._jira_base_url = '' + settings.jira_protocol + '://' + settings.jira_domain + settings.jira_path;
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
	this._request = require( 'request' ).defaults({
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
 * Base URL for rest api requests
 * @returns {string}
 * @private
 */
PP_Jira.prototype._get_rest_base_url = function(){
	return this._jira_base_url + 'rest/api/2/';
};

/**
 * Base URL for auth api requests
 * @returns {string}
 * @private
 */
PP_Jira.prototype._get_auth_base_url = function(){
	return this._jira_base_url + 'rest/auth/1/';
};

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

PP_Jira.prototype.get_callback_args = function(){
	return this._callback_args;
}

/**
 * Gets the URL for linking to a Jira issue
 *
 * @returns {string|boolean}
 */
PP_Jira.prototype.get_jira_link_url = function(issue_id){
	return this._jira_link_url && issue_id ? this._jira_link_url + issue_id : false;
};

/**
 * Gets the main parts of the options for a request
 *
 * @param method string HTTP method to use
 * @param service string Service to call
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param use_auth_uri boolean If true then the auth api is called, otherwise the rest api is called
 * @returns {{url: string, method: *}}
 * @private
 */
PP_Jira.prototype._get_request_opts = function(method, service, username, password, use_auth_uri){
	// Options for request
	var opts = {
		method: method
	};

	if( true === use_auth_uri ) {
		opts.url = this._get_auth_base_url() + service;
	} else {
		opts.url = this._get_rest_base_url() + service;
	}

	// If we have a username then log in.  Otherwise assume a session
	if( username ){
		opts.auth = {
			'user': username,
			'pass': password,
			'sendImmediately': true
		};
	}

	return opts;
};

/**
 * Internal function which runs actual request
 *
 * @param opts {} The options to pass to the request
 * @param username  * @param username string Username for authentication
 * @param callback function Callback function to process data
 * @param args {} Extra arguments to pass to the callback
 * @private
 */
PP_Jira.prototype._run_request = function(opts, username, callback, args){
	// Save args for callback
	this._callback_args = args;
	logger.log('running request');
	logger.log_o(opts);
	// Save this as a variable then wrap callback in an anonymous function in order to add the jira param
	var jira = this;

	if( this._request_in_progress ){
		throw new PP_Exceptions.PP_Exception('Request already in progress');
	}

	// Run request
	this._request_in_progress = true;
	this._message = '';
	this._request(opts, function(error, response, body){
		logger.log('response');
		logger.log_o(jira._get_response_code(response));
		logger.log(response.headers);
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
 * Internal function to make GET requests
 *
 * @param service string The service to call (url fragment)
 * @param data object Data to append as query string
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param callback function Callback function to process data
 * @param args {} Extra arguments to pass to the callback
 * @private
 */
PP_Jira.prototype._get = function(service, data, callback, username, password, args) {

	// Options for request
	var opts = this._get_request_opts('GET', service, username, password);

	// If we have data add to the request
	if( data ) {
		opts.qs = data;
	}

	this._run_request(opts, username, callback, args);
};

/**
 * Internal function to make POST requests
 *
 * @param service string The service to call (url fragment)
 * @param data object Data to append as query string
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param callback function Callback function to process data
 * @param args {} Extra arguments to pass to the callback
 * @param use_auth_uri boolean If true then the auth api is called, otherwise the rest api is called
 * @private
 */
PP_Jira.prototype._post = function(service, data, callback, username, password, args, use_auth_uri) {

	// Options for request
	var opts = this._get_request_opts('POST', service, username, password, use_auth_uri);

	if( data ){
		opts.body = data;
	}

	//logger.log_o(opts);

	this._run_request(opts, username, callback, args);
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

	// Run request
	this._get( 'myself', false, this._authentication_callback, username, password, args);
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
	if( jira._get_response_code(response) ) {
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
		jira._post_callback_callback(jira, body, jira.get_callback_args());
		jira._post_callback_callback = false;
	}
};

PP_Jira.prototype._get_response_code = function(response){
	if( response && response instanceof Object && response.hasOwnProperty('statusCode') ) {
		return response.statusCode;
	} else {
		return false;
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
PP_Jira.prototype.get_issue = function(issue_id, data, callback, args){
	this._get('issue/' + issue_id, data, callback, false, false, args);
};

PP_Jira.prototype.get_issue_types = function(callback, args){
	this._get('issuetype', false, this._got_issue_types, false, false, {callback: callback, args: args});
};

PP_Jira.prototype._got_issue_types = function( error, response, body, jira ){
	logger.log('_got_issue_types');
	logger.log_o( jira._get_response_code(response) );
	logger.log_o(body, 2);
	if( jira._get_response_code(response) && 200 == jira._get_response_code(response) ){
		var args = jira.get_callback_args();
		for( var i in body ){
			logger.log( 'setting ' + body[ i ].id + ' false' );
			args.args.controller.icons.issue_types[  body[ i ].id ] = false;
		}
		for( var i in body ){
			var bin_args = {
				issue_id: body[ i ].id,
				issue_name: body[ i ].name,
				args: args
			};
			jira.get_binary_data( body[i].iconUrl, jira._got_issue_type, bin_args);
		}
	}
};


PP_Jira.prototype._got_issue_type = function( error, response, body, jira, args ){
	logger.log('called _got_issue_type ');
	logger.log_o( jira._get_response_code(response) );
	logger.log_o( args, 2 );
	if( jira._get_response_code(response) && 200 == jira._get_response_code(response) && args && args.args ) {
		var ws = args.args.args.ws;
		var controller = args.args.args.controller;
		controller.icons.issue_types[args.issue_id] = {
			name: args.issue_name,
			icon: new Buffer(body ).toString('base64'),
			mime_type : response.headers["content-type"]
		};
		logger.log_o(controller.icons.issue_types);
		args.args.callback.call(this, args.args.args);
	}
};

PP_Jira.prototype.get_binary_data = function(url, callback, args){
	logger.log('called get_binary_data for ' + url);
	var jira = this;
	var bin_req = this._request({
        encoding: null,
		url: url,
		method: 'GET'
    }, function(error, response, body){
		callback.call(this, error, response, body, jira, args);
	});
};

PP_Jira.prototype.format_string_as_html = function(str){
	// Based on http://stackoverflow.com/a/14430759/209568
	var ret = str
			.replace(/\r\n?/g,'\n') // normalise linebreaks
			.replace(/(^((?!\n)\s)+|((?!\n)\s)+$)/gm,'') // trim each line
			.replace(/(?!\n)\s+/g,' ') // reduce multiple spaces to 2 (like in "a    b")
			.replace(/^\n+|\n+$/g,'') // trim the whole string
			.replace(/[<>&"']/g,function(a) { // replace these signs with encoded versions
			         switch (a) {
				         case '<'    : return '&lt;';
				         case '>'    : return '&gt;';
				         case '&'    : return '&amp;';
				         case '"'    : return '&quot;';
				         case '\''   : return '&apos;';
			         }
            })
            .replace(/\n{2,}/g,'</p><p>') // replace 2 or more consecutive empty lines with end/start p
			.replace(/\n/g,'<br />') // replace single newline symbols with the <br /> entity
			.replace(/^(.+?)$/,'<p>$1</p>'); // wrap all the string into <p> tags
											// if there's at least 1 non-empty character


	ret = Autolinker.link(ret, {
		newWindow: true,
		stripPrefix: false,
		phone: false,
		twitter: false
	});
	return ret;
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
