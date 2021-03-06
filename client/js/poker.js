"use strict";

// @@include('inc/options.js')

function log(message){
	if( options.debug ){
		console && console.log && console.log(message);
	}
}
function log_o(label, obj){
	if( options.debug ){
		console && console.log && console.log(label + ': %o', obj);
	}
}
var app = angular.module("pokerApp", ['ngStorage', 'ngWebsocket', 'ngTouch', 'angular-carousel', 'mm.foundation']);

(function(app, options){

	function PP_Storage($localStorage, default_vals){
		this._local_storage = $localStorage.$default(default_vals);
		this._default_vals = default_vals;
		this._storage = {};
		this.use_local = false;


		this.set_storage_type= function(use_local){
			log_o('setting local storage', use_local);
			if( use_local ){
				this._storage = this._local_storage;
				this.use_local = true;
				this.set('use_local', true);
			}else{
				this._storage = {};
				this._local_storage['pp_use_local'] = false;
				for( var k in this._default_vals ) {
					this._storage[k] = this._default_vals[k];
				}
				this.use_local = false;
			}
		};

		this.get = function(name){
			return this._storage['pp_' + name];
		}
		this.set = function(name, value){
			return this._storage['pp_' + name] = value;
		}

		this.clear = function(){
			if( this.use_local ) {
				for( var k in this._storage ){
					delete this._storage[k];
				}
			} else {
				this._storage = {};
			}
			for( var k in this._default_vals ) {
				this._storage[k] = this._default_vals[k];
			}
		}

		this.set_storage_type($localStorage.pp_use_local || default_vals.pp_use_local);
	};

	var base_controller = {

		jira_icons: {},
		fields: {},
		summary_fields: {},
		detail_fields: {},
		avatars: {},

		/* WebSocket Handling */
		ws_create_connection: function($websocket){
			return $websocket.$new({
				                       url: options.websocket.uri,
				                       reconnect: true,
				                       enqueue: options.websocket.enqueue ? true : false
			                       });
		},
		ws_connected: function($scope, event){
			console.log('Websocket connected!');
			log($scope.storage.get('player_id'));
			if( $scope.storage.get('player_id') ){
				var data = {
					player_id: $scope.storage.get('player_id')
				};
				base_controller.ws_do_action($scope, 'connect', data);
			} else {
				base_controller.ws_do_action($scope, 'connect', {});
				base_controller.ws_do_action($scope, 'list_meetings', {});
			}

		},
		ws_closed: function(){
			console.log('Websocket closed.  Bye bye!');
		},
		ws_message_received: function($scope, data){
			log_o('received from websocket', data);
			log_o('data.success',  data.success );
			if( data.success ){
				if( data.data && data.data.is_update ){
					// Update the upstream model
					$scope.$emit('pp_update_status', data);
				} else {
					log_o('action received',  data.action );
					switch( data.action ){
						case 'settings':
							base_controller.set_settings($scope, data.data);
							break;
						case 'meetings_list':
							$scope.update_meetings_list(data);
							break;
						case 'login':
							$scope.post_login(data);
							break;
						case 'update_jira_icons':
							base_controller.update_jira_icons($scope, data.data);
							break;
						case 'fields':
							base_controller.set_fields($scope, data.data);
							break;
						case 'add_avatar':
							base_controller.add_avatar($scope, data.data);
							break;
					}
				}
			} else {
				log_o('error', data);
				switch( data.action ){
					case 'connect':
						$scope.storage.set('player_id', false);
				}
			}
		},
		ws_do_action: function($scope, action, data){
			log_o('do_action: ' + action, data);
			if( !angular.isObject(data) ) {
				data = {};
			}
			if( $scope.meeting.meeting_id ){
				data.meeting_id = $scope.meeting.meeting_id;
			}
			if( $scope.user.player_id ){
				data.player_id = $scope.user.player_id;
			}
			$scope.ws.$emit(action, data);
		},

		get_boolean: function(val){
			if( val && 'false' !== ('' + val).toLowerCase() ){
				return true;
			} else {
				return false;
			}
		},

		/* Update */
		set_settings: function( $scope, data  ) {
			$scope.settings.allow_guest = data.allow_guest;
		},

		update_status: function($scope, data, $sce){
			log_o( 'updating status', data );
			log_o('before', $scope.meeting);
			$scope.$apply(function(){
				var max_num_same = 0;
				for( var i in data.data.players ){
					if( max_num_same < data.data.players[ i ].bid_pos ){
						max_num_same = data.data.players[ i ].bid_pos;
					}
				}
				$scope.meeting.meeting_id = data.meeting;
				$scope.user.player_id = data.player;
				$scope.storage.set('player_id', data.player);
				$scope.meeting.meeting_name = data.data.meeting;
				$scope.meeting.host_name = data.data.host;
				$scope.meeting.players = data.data.players;
				$scope.meeting.max_num_same = max_num_same;
				$scope.meeting.issue = data.data.issue;
				if( data.data.issue ){
					if( data.data.issue.hasOwnProperty('description') ){
						$scope.meeting.issue.description = $sce.trustAsHtml(data.data.issue.description);
					}
					base_controller.update_issue_fields($scope);
				}
				$scope.meeting.show_cards = data.data.show_cards;
				$scope.meeting.is_host = data.data.you_are_host ? true : false;
				$scope.meeting.my_bid =  data.data.your_bid;
				$scope.meeting.all_chosen = true;
				for( var p in $scope.meeting.players ){
					if( false === base_controller.get_boolean( $scope.meeting.players[ p ].bid ) ){
						$scope.meeting.players[ p ].bid = false;
					}
					log_o($scope.meeting.players[ p ].name, $scope.meeting.players[ p ].bid);
					if( !$scope.meeting.players[ p ].bid ) {
						$scope.meeting.all_chosen = false;
					}
				}
				log_o('after', $scope.meeting);
				if( data.data.hasOwnProperty('notice') ){
					// TODO: show notices as messages?
				}
				// Trigger downstream updates too
				$scope.$broadcast('pp_status_updated');
			});

		},

		update_issue_fields: function($scope){
			if( $scope.meeting && $scope.meeting.issue ){
				log_o(' base_controller.summary_fields',  base_controller.summary_fields);
				log_o('data.data.issue.custom_fields', $scope.meeting.issue.custom_fields);
				$scope.meeting.issue.summary_fields = {};
				for( var k in base_controller.summary_fields ){
					log('trying ' + k);
					if( angular.isObject($scope.meeting.issue.custom_fields) && $scope.meeting.issue.custom_fields.hasOwnProperty(k) ){
						$scope.meeting.issue.summary_fields[ k ] = {
							name: base_controller.summary_fields[ k ].name,
							block: base_controller.summary_fields[ k ].block,
							value: $scope.meeting.issue.custom_fields[ k ]
						};
					}
				}
				log_o('$scope.meeting.issue.summary_fields', $scope.meeting.issue.summary_fields);
				$scope.meeting.issue.detail_fields = {};
				for( var k in base_controller.detail_fields ){
					if( angular.isObject($scope.meeting.issue.custom_fields) && $scope.meeting.issue.custom_fields.hasOwnProperty(k) ){
						$scope.meeting.issue.detail_fields[ k ] = {
							name: base_controller.detail_fields[ k ].name,
							block: base_controller.detail_fields[ k ].block,
							value: $scope.meeting.issue.custom_fields[ k ]
						};
					}
				}

			}
		},

		post_login: function($scope, data){
			log_o('post_login', data);
			$scope.$apply(function() {
				if( data.data.logged_in ) {
					$scope.user.player_id = data.player;
					$scope.storage.set('player_id', data.player);
					$scope.user.logged_in = true;
					$scope.user.authenticated = data.data.authenticated_user;
					$scope.user.name = data.data.player_dispname;
				} else {
					$scope.user.player_id = false;
					$scope.user.logged_in = false;
					$scope.user.authenticated = false;
					$scope.user.name = '';
				}
			});
		},

		update_meetings_list: function($scope, data){
			$scope.$apply(function(){
				$scope.meetings_list = [];
				console.log('data.data: %o', data.data);
				for( var i in data.data ){
					log_o('data.data[' + i + ']', data.data[i]);
					$scope.meetings_list.push( data.data[i] );
				}
			});
		},

		update_jira_icons: function($scope, data){
			var controller = this;
			$scope.$apply(function(){
				controller.jira_icons = data;
				log_o('jira_icons', controller.jira_icons);
			});
		},

		set_fields: function($scope, data){
			var controller = this;
			log_o('set_fields', data);
			$scope.$apply(function(){
				controller.fields = data;
				controller.summary_fields = {};
				controller.detail_fields = {};
				if( controller.fields ){
					for( var k in controller.fields ){
						if( controller.fields[ k ].summary ){
							controller.summary_fields[ k ] = controller.fields[ k ];
						} else {
							controller.detail_fields[ k ] = controller.fields[ k ];
						}
					}
				}
				log_o('fields', controller.fields);
				base_controller.update_issue_fields($scope);
			});
		},

		add_avatar: function($scope, data){
			var controller = this;
			$scope.$apply(function(){
				controller.avatars[ data.id ] = data;
				log_o('avatars', controller.avatars);
			});
		},

		get_avatar: function(id, size){
			if( id && angular.isObject(this.avatars) && this.avatars.hasOwnProperty(id) && angular.isObject(this.avatars[id]) ){
				if( this.avatars[id ].hasOwnProperty(size) && angular.isObject(this.avatars[id][size]) && this.avatars[id][size ].hasOwnProperty('icon') ){
					return 'data:' + this.avatars[id][size].mime_type + ';base64,' + this.avatars[id][size].icon;
				}
			}
			return '';
		},

		get_issue_type_icon: function(id){
			if( id && angular.isObject(base_controller.jira_icons) && angular.isObject(base_controller.jira_icons.issue_types) ){
				if( angular.isObject(base_controller.jira_icons.issue_types[id]) && base_controller.jira_icons.issue_types[id].icon ){
					return 'data:' + base_controller.jira_icons.issue_types[id].mime_type + ';base64,' + base_controller.jira_icons.issue_types[id].icon;
				}
			}
			return '';
		},

		get_prio_icon: function(id){
			if( id && angular.isObject(base_controller.jira_icons) && angular.isObject(base_controller.jira_icons.prios) ){
				if( angular.isObject(base_controller.jira_icons.prios[id]) && base_controller.jira_icons.prios[id].icon ){
					return 'data:' + base_controller.jira_icons.prios[id].mime_type + ';base64,' + base_controller.jira_icons.prios[id].icon;
				}
			}
			return '';
		},

		get_prio_colour: function(id){
			if( id && angular.isObject(base_controller.jira_icons) && angular.isObject(base_controller.jira_icons.prios) ){
				if( angular.isObject(base_controller.jira_icons.prios[id]) && base_controller.jira_icons.prios[id].colour ){
					return base_controller.jira_icons.prios[id].colour;
				}
			}
		},

		get_initial_status: function($scope) {
			return {
				meeting_id: false,
				player_id: $scope.storage.get('player_id'),
				meeting_name: false,
				host_name: false,
				players: {},
				issue: {},
				show_cards: false,
				is_host: false
			}
		},

		/* User handling */
		get_initial_user: function($scope){
			return {
				logged_in: $scope.storage.get('dispname') ? true : false,
				name: $scope.storage.get('dispname')
			}
		},

		/* Actions */
		create_meeting: function($scope) {
			var data = {
				player_name: $scope.user.name,
				meeting_name: $scope.action_data.meeting_name
			};
			log_o('create meeting data', data);
			$scope.do_action('create_meeting', data)
		},

		logout: function($scope) {
			$scope.do_action('logout');
			$scope.storage.clear();
			$scope.user = {};
		}
	};



	app.controller('AppController', ['$scope',
	                                 '$localStorage',
	                                 '$websocket',
	                                 '$sce',
	                                 function($scope, $localStorage, $websocket, $sce){

		                                 var default_vals = {
			                                 pp_use_local: true,
			                                 pp_dispname: '',
			                                 pp_player_id: false
		                                 };
		                                 $scope.storage = new PP_Storage($localStorage, default_vals);


		                                 // Open the websocket connection
		                                 $scope.ws = base_controller.ws_create_connection($websocket);

		                                 $scope.ws
			                                 .$on('$open', function(event){
				                                      base_controller.ws_connected($scope, event);
			                                      })
			                                 .$on('$close', base_controller.ws_closed)
			                                 .$on('$message', function(data){
				                                      return base_controller.ws_message_received($scope, data);
			                                      });
		                                 $scope.do_action = function(action, data){
			                                 return base_controller.ws_do_action($scope, action, data);
		                                 };

		                                 $scope.$on('pp_update_status', function(event, data){
			                                 base_controller.update_status($scope, data, $sce);
		                                 });

		                                 $scope.settings = {};

		                                 $scope.meeting = base_controller.get_initial_status($scope);
		                                 $scope.user = base_controller.get_initial_user($scope);
		                                 $scope.update_meetings_list = function(data){
			                                 return base_controller.update_meetings_list($scope, data);
		                                 };
		                                 $scope.post_login = function(data){
			                                 return base_controller.post_login($scope, data);
		                                 }
		                                 $scope.action_data = {};
		                                 $scope.meetings_list = [];

		                                 this.join_meeting = function(meeting_id){
			                                 $scope.do_action('join_meeting', {
				                                 meeting_id: meeting_id
			                                 });
		                                 };
		                                 this.create_meeting = function(){
			                                 base_controller.create_meeting($scope);
		                                 };
		                                 $scope.logout = function(){
			                                 return base_controller.logout($scope);
		                                 };

		                                 $scope.get_board_view = function(){
			                                 switch( $scope.meeting.board_view ) {
				                                 case 'set_issue':
					                                 return 'set_issue';
					                                 break;
			                                 }
			                                 // If we get this far set it to be safe
			                                 $scope.meeting.board_view = 'main_board';
			                                 return 'main_board';
		                                 };
		                                 $scope.show_main_board = function(){
			                                 return 'main_board' === $scope.get_board_view();
		                                 };
		                                 $scope.show_set_issue = function(){
			                                 return 'set_issue' === $scope.get_board_view();
		                                 };

		                                 $scope.set_main_board_view = function(){
			                                 $scope.meeting.board_view ='main_board';
		                                 };

		                                 $scope.get_issue_type_icon = base_controller.get_issue_type_icon;
		                                 $scope.get_meeting_issue_type_icon = function(){
			                                 return base_controller.get_issue_type_icon($scope.meeting.issue.type_id);
		                                 };
		                                 $scope.get_meeting_issue_prio_icon = function(){
			                                 return base_controller.get_prio_icon($scope.meeting.issue.prio_id);
		                                 };
		                                 $scope.get_meeting_issue_prio_colour = function(){
			                                 return base_controller.get_prio_colour($scope.meeting.issue.prio_id);
		                                 };

		                                 $scope.get_small_avatar = function(id){
			                                 return base_controller.get_avatar(id, 'small');
		                                 };

		                                 $scope.get_large_avatar = function(id){
			                                 return base_controller.get_avatar(id, 'large');
		                                 };



	                                 }]);

})(app, options);


// @@include('inc/menu.js')
// @@include('inc/login.js')
// @@include('inc/bid.js')
// @@include('inc/issue.js')
