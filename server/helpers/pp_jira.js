"use strict";

// Get config
var settings = require( '../settings' ).settings;

// Get helpers
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
 * Checks if the request succeeded
 * @param response
 * @returns boolean
 * @private
 */
PP_Jira.prototype._response_ok = function(response){
	return this._get_response_code(response) && 200 == this._get_response_code(response);
};
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

/**
 * Gets the URL for linking to a Jira issue
 *
 * @returns {string|boolean}
 */
PP_Jira.prototype.get_jira_link_url = function(issue_id){
	return this._jira_link_url && issue_id ? this._jira_link_url + issue_id : false;
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
 * Safely gets the response code from the raw response
 * @param response
 * @returns {*}
 * @private
 */
PP_Jira.prototype._get_response_code = function(response){
	if( response && response instanceof Object && response.hasOwnProperty('statusCode') ) {
		return response.statusCode;
	} else {
		return false;
	}
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
PP_Jira.prototype._run_request = function(opts, username, callback, args, post_callback_callback){
	logger.log('running request');
	logger.log_o(opts);
	// Save this as a variable then wrap callback in an anonymous function in order to add the jira param
	var jira = this;

	// Run request
	this._message = '';
	this._request(opts, function(error, response, body){
		logger.log('response');
		logger.log('response code: ' + jira._get_response_code(response));
		// If we have a username assume we are logging in.  In this case the authentication routine handles the response
		// Otherwise fail if 401 returned
		if( !username && response.statusCode === 401 ){
			throw new PP_Exceptions.PP_NotAuthorisedException('You must log in to complete that action');
		}
		// Request complete
		jira._request_in_progress = false;
		// Call callback
		callback.call(this, error, response, body, jira, args, post_callback_callback);
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
 * @param args {} Extra arguments to pass to the callback,
 * @param post_callback_callback Callback to be run after internal callback
 * @private
 */
PP_Jira.prototype._get = function(service, data, callback, username, password, args, post_callback_callback) {

	// Options for request
	var opts = this._get_request_opts('GET', service, username, password);

	// If we have data add to the request
	if( data ) {
		opts.qs = data;
	}

	this._run_request(opts, username, callback, args, post_callback_callback);
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

	this._run_request(opts, username, callback, args);
};

/**
 * Fetches binary data (e.g. images) from the specified URI
 * @param url
 * @param callback
 * @param args
 * @private
 */
PP_Jira.prototype._get_binary_data = function(url, callback, args, post_callback_callback, callback_args){
	logger.log('called _get_binary_data for ' + url);
	var jira = this;
	var bin_req = this._request({
		                            encoding: null,
		                            url: url,
		                            method: 'GET'
	                            }, function(error, response, body){
		callback.call(this, error, response, body, jira, args, post_callback_callback, callback_args);
	});
};

/**
 * Authenticates the user and creates a session
 *
 * @param username string
 * @param password string
 */
PP_Jira.prototype.authenticate = function(username, password, callback, args){
	logger.log('PP_Jira.authenticate ' + username);
	this._username = username;

	// Run request
	this._get( 'myself', false, this._authentication_callback, username, password, args, callback);
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
PP_Jira.prototype._authentication_callback = function(error, response, body, jira, args, callback){
	logger.log('_authentication_callback');
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
		logger.log(jira.get_message());
	}

	if( typeof callback === 'function' ) {
		callback(jira, body, args);
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

/**
 * Fetches basic info on issue types (including icons)
 * @param callback Callback function to run
 * @param args Arguments to send forward to callbacks
 */
PP_Jira.prototype.get_issue_types = function(callback, args){
	this._get('issuetype', false, this._got_issue_types, false, false, args, callback);
};

/**
 * Callback run after fetching issue types list.  Fetches icons for each
 * @param error
 * @param response
 * @param body
 * @param jira
 * @private
 */
PP_Jira.prototype._got_issue_types = function( error, response, body, jira, args, callback ){
	if( jira._response_ok(response) ){
		for( var i in body ){
			args.controller.icons.issue_types[  body[ i ].id ] = false;
		}
		for( var i in body ){
			var bin_args = {
				issue_id: body[ i ].id,
				issue_name: body[ i ].name
			};
			jira._get_binary_data( body[i].iconUrl, jira._got_issue_type, bin_args, callback, args);
		}
	}
};

/**
 * Callback run after fetching icon for an issue type
 * @param error
 * @param response
 * @param body
 * @param jira
 * @param args
 * @private
 */
PP_Jira.prototype._got_issue_type = function( error, response, body, jira, args, callback, callback_args ){
	logger.log('PP_Jira::_got_issue_type');
	logger.log_o(args, 2);
	logger.log_o(callback_args, 1);
	if( jira._response_ok(response) ) {
		var ws = callback_args.ws;
		var controller = callback_args.controller;
		controller.icons.issue_types[args.issue_id] = {
			name: args.issue_name,
			icon: new Buffer(body ).toString('base64'),
			mime_type : response.headers["content-type"]
		};
		if( typeof callback === 'function' ){
			callback(callback_args);
		}
	}
};

/**
 * Gets basic info on priorities, including icons
 * @param callback Callback function to run
 * @param args Arguments to send forward to callbacks
 */
PP_Jira.prototype.get_prios = function(callback, args){
	this._get('priority', false, this._got_prios, false, false, args, callback);
};

/**
 * Callback run after fetching prios list.  Fetches icons for each
 * @param error
 * @param response
 * @param body
 * @param jira
 * @private
 */
PP_Jira.prototype._got_prios = function( error, response, body, jira, args, callback ){
	if( jira._response_ok(response) ){
		for( var i in body ){
			args.controller.icons.prios[  body[ i ].id ] = false;
		}
		for( var i in body ){
			var bin_args = {
				prio_id: body[ i ].id,
				prio_name: body[ i ].name,
				prio_colour: body[ i ].statusColor
			};
			jira._get_binary_data( body[i].iconUrl, jira._got_prio, bin_args, callback, args);
		}
	}
};


/**
 * Callback run after fetching icon for a prio
 * @param error
 * @param response
 * @param body
 * @param jira
 * @param args
 * @private
 */
PP_Jira.prototype._got_prio = function( error, response, body, jira, args, callback, callback_args ){
	logger.log('PP_Jira::_got_prio');
	logger.log_o(args, 2);
	logger.log_o(callback_args, 1)
	if( jira._response_ok(response) ) {
		var ws = callback_args.ws;
		var controller = callback_args.controller;
		controller.icons.prios[args.prio_id] = {
			name: args.prio_name,
			colour: args.prio_colour,
			icon: new Buffer(body ).toString('base64'),
			mime_type : response.headers["content-type"]
		};
		if( typeof callback === 'function' ){
			callback(callback_args);
		}
	}
};

/**
 * Gets info (name) about extra fields
 * @param callback
 * @param args
 */
PP_Jira.prototype.get_fields_info = function( callback, args ){
	this._get( 'field', {}, this._got_fields, false, false, args, callback );
};

/**
 * Callback run after fetching info about fields
 * @param error
 * @param response
 * @param body
 * @param jira
 * @param args
 * @private
 */
PP_Jira.prototype._got_fields = function( error, response, body, jira, args, callback ){
	if( jira._response_ok(response) ){
		var all_fields = {};
		for( var i in body ){
			all_fields[ body[ i ].id ] = body[ i ].name;
		}
		var fields = {};
		for( var i in settings.jira_extra_fields ){
			var id = settings.jira_extra_fields[ i ].id;
			fields[ id ] = {
				name: all_fields[ id ],
				summary: settings.jira_extra_fields[ i ].summary,
				block: settings.jira_extra_fields[ i ].block
			};
		}

		if( typeof callback === 'function' ){
			callback(args, fields);
		}
	}
};

/**
 * Gets avatars for a given user
 * @param callback
 * @param avatarUrls
 * @param args
 */
PP_Jira.prototype.get_avatars = function(callback, avatarUrls, args){
	var id = args.id;
	args.controller.avatars[id] = {
		small: false,
		large: false
	};

	this._get_binary_data(avatarUrls['24x24'], this._got_avatar, { size: 'small' }, callback, args);
	this._get_binary_data(avatarUrls['48x48'], this._got_avatar, { size: 'large' }, callback, args);
};

/**
 * Callback run after fetching an avatar
 * @param error
 * @param response
 * @param body
 * @param jira
 * @param args
 * @private
 */
PP_Jira.prototype._got_avatar = function( error, response, body, jira, args, callback, callback_args ){
	if( jira._response_ok(response) ) {
		var controller = callback_args.controller;

		controller.avatars[callback_args.id][args.size] = {
			icon: new Buffer(body ).toString('base64'),
			mime_type : response.headers["content-type"]
		};
		if( typeof callback === 'function') {
			callback.call(this, callback_args);
		}
	}
};


/**
 * Formats strings such as descriptions which come from Jira to HTML
 *
 * Adds paragraphs, converts some characters to HTML entities and makes things which look like links into links
 *
 * @param str
 * @returns {string}
 */
PP_Jira.prototype.format_string_as_html = function(str){
	logger.log_o('null');
	logger.log('format_string_as_html');
	logger.log( typeof str );
	logger.log_o(str);
	logger.log(str);
	str = '' + str;
	if( 'null' === str ) {
		return '';
	} else {
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


		// Make things which look like links into links
		ret = Autolinker.link(ret, {
			newWindow: true,
			stripPrefix: false,
			phone: false,
			twitter: false
		});
		return ret;
	}
};



module.exports = {
	PP_Jira: PP_Jira
};
