"use strict";

// Get config
var settings = require( '../settings' ).settings;

// Get helpers
var PP_Logger = require( '../helpers/pp_logger').PP_Logger;
var logger = new PP_Logger
var PP_Jira = require( '../helpers/pp_jira').PP_Jira;


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
	this.extended_info = false;
	this.type_name = false;
	this.type_id = false;
	this.prio_id = false;
	this.prio_name = false;
	this.parent_id = false;
	this.parent_name = false;
	this.parent_link = false;
	this.parent_type = false;
	this.parent_type_icon = false;
	this.attachments = false;
	this.project_name = false;
	this.reporter_name = false;
	this.links = false;
	this.status_name = false;
	this.status_icon = false;
	this.custom_fields = false;
	this.num_subtasks = false;
	this.num_comments = false;
}

/**
 * Sets the link based on the id and the global setting for the Jira link url
 */
PP_Issue.prototype.set_jira_link_from_id = function() {
	var jira = new PP_Jira();
	this.link = jira.get_jira_link_url(this.id);
};

/**
 * Generates an object describing the _issue to be used in the response
 *
 * @returns {{id: exports.id, name: (*|exports.name), desc: *, link: *}}
 */
PP_Issue.prototype.get_info_for_response = function() {
	return this;
}

module.exports = {
	PP_Issue: PP_Issue
};
