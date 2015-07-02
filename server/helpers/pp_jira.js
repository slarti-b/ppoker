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
	//this._request = require('request');
	this._jira_base_url = '' + settings.jira_url;
	if( this._jira_base_url.slice(-1) !== '/' ){
		this._jira_base_url += '/';
	}
	this._jira_link_url = this._jira_base_url ? this._jira_base_url + 'browse/' : false;
	this._request = require('request').defaults({
		'baseUrl': this._jira_base_url + 'rest/api/2/',
		'json': true
     });


}

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
PP_Jira.prototype._get = function(service, data, username, password, callback) {
	var url = this._jira_base_url + 'rest/api/2/' + service;
	//var auth = {
	//	'user': username,
	//	'pass': password,
	//	'sendImmediately': true
	//};
	var auth = 'Basic ' + new Buffer(username + ':' + password ).toString('base64');
	logger.log(url);
	logger.log(auth);
	this._request({
		url: '/' + service,
		method: 'GET',
		qs: data,
		headers: {
			'Authorization': auth
		}

    }, callback);
};

/**
 * Gets info on an issue
 *
 * @param issue_id string The Jira ID of the issue
 * @param username string Username for authentication
 * @param password string Password for authentication
 * @param callback function Callback function to process data
 */
PP_Jira.prototype.get_issue = function(issue_id, data, username, password, callback){
	this._get('issue/' + issue_id, data, username, password, callback);
};


module.exports = {
	PP_Jira: PP_Jira
};
