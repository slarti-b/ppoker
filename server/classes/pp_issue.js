"use strict";

// Get config
var settings = require( '../settings' ).settings;

// Get helpers
var PP_Logger = require( '../helpers/pp_logger').PP_Logger;
var logger = new PP_Logger
var PP_Jira = require( '../helpers/pp_jira').PP_Jira;
var jira = new PP_Jira();


/**
 * Class defining an issue
 * @param id string The ID of the issue
 * @param name string The name of thr issue
 * @param description string The description of the issue
 * @param link string A link to the issue
 * @constructor
 */
function PP_Issue( id, name, description, link ) {
	this.id = id;
	this.name = name;
	this.link = link;
	this.description = description;
}

/**
 * Sets the link based on the id and the global setting for the Jira link url
 */
PP_Issue.prototype.set_jira_link_from_id = function() {
	this.link = jira.get_jira_link_url(this.id);
};

/**
 * Sets the _issue fetching all info from Jira
 * @param id string The ID of the _issue
 */
PP_Issue.prototype.set_from_jira = function( id ) {
	this.id = id;
	// TODO: Implement fetch from Jira
	this.name = 'Jira PP_Issue ' + id;
	this.description = '';
	this.set_jira_link_from_id();
};

/**
 * Generates an object describing the _issue to be used in the response
 *
 * @returns {{id: exports.id, name: (*|exports.name), desc: *, link: *}}
 */
PP_Issue.prototype.get_info_for_response = function() {
	return {
		id:   this.id,
		name: this.name,
		desc: this.description,
		link: this.link
	};
}

module.exports = {
	PP_Issue: PP_Issue
};
