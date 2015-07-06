"use strict";

function log(message){
	console && console.log && console.log(message);
}
function log_o(label, obj){
	console && console.log && console.log(label + ': %o', obj);
}
var app = angular.module("pokerApp", ['ngStorage', 'ngWebsocket']);

(function(app, options){

	function PP_Storage($localStorage, default_vals){
		this._local_storage = $localStorage.$default(default_vals);
		this._default_vals = default_vals;
		this._storage = {};
		this._use_local_storage = false;


		this.set_storage_type= function(use_local){
			log_o('setting lcoal storage', use_local);
			if( use_local ){
				this._storage = this._local_storage;
				this._use_local_storage = true;
			}else{
				this._storage = {};
				for( var k in this._default_vals ) {
					this._storage[k] = this._default_vals[k];
				}
				this._use_local_storage = false;
			}
		};

		this.get = function(name){
			return this._storage['pp_' + name];
		}
		this.set = function(name, value){
			return this._storage['pp_' + name] = value;
		}

		this.clear = function(){
			if( this._use_local_storage ) {
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
						case 'meetings_list':
							$scope.update_meetings_list(data);
							break;
						case 'login':
							$scope.post_login(data);
							break;
					}
				}
			} else {
				log_o('error', data);
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

		/* Update */
		update_status: function($scope, data, $sce){
			log_o( 'updating status', data );
			log_o('before', $scope.meeting);
			$scope.$apply(function(){
				$scope.meeting.meeting_id = data.meeting;
				$scope.user.player_id = data.player;
				$scope.storage.set('player_id', data.player);
				$scope.meeting.meeting_name = data.data.meeting;
				$scope.meeting.host_name = data.data.host;
				$scope.meeting.players = data.data.players;
				$scope.meeting.issue = data.data.issue;
				if( data.data.issue && data.data.issue.hasOwnProperty('desc') ){
					$scope.meeting.issue.desc = $sce.trustAsHtml(data.data.issue.desc);
				}
				$scope.meeting.show_cards = data.data.show_cards;
				$scope.meeting.is_host = data.data.you_are_host ? true : false;
				$scope.meeting.my_bid =  data.data.your_bid;
				$scope.meeting.all_chosen = true;
				for( var p in data.data.players ){
					if( !data.data.players[p ].bid ) {
						$scope.meeting.all_chosen = false;
						break;
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

		post_login: function($scope, data){
			log_o('post_login', data);
			$scope.$apply(function() {
				if( data.data.logged_in ) {
					$scope.user.player_id = data.player;
					$scope.storage.set('player_id', data.player);
					$scope.user.logged_in = true;
					$scope.user.authenticated = data.data.authenticated_user;
					$scope.user.name = data.data.player_dispname;
					$scope.user.avatar = data.data.avatar;
				} else {
					$scope.user.player_id = false;
					$scope.user.logged_in = false;
					$scope.user.authenticated = false;
					$scope.user.name = '';
					$scope.user.avatar = '';
				}
			});
		},

		update_meetings_list: function($scope, data){
			log_o('Updating meetings', data.data);
			log_o('meetings_list', $scope.meetings_list);
			$scope.$apply(function(){
				$scope.meetings_list = [];
				console.log('data.data: %o', data.data);
				for( var i in data.data ){
					log_o('data.data[' + i + ']', data.data[i]);
					$scope.meetings_list.push( data.data[i] );
				}
			});
			log_o('meetings_list', $scope.meetings_list);
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
			$scope.storage.clear();
			$scope.user = {};
			$scope.do_action('logout');
		}
	};



	app.controller('AppController', ['$scope',
	                                 '$localStorage',
	                                 '$sessionStorage',
	                                 '$websocket',
	                                 '$sce',
	                                 function($scope, $localStorage, $sessionStorage, $websocket, $sce){

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
		}



	}]);

})(app, options);





