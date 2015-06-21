"use strict";

function log(message){
	console && console.log && console.log(message);
}
function log_o(label, obj){
	console && console.log && console.log(label + ': %o', obj);
}
var app = angular.module("pokerApp", ['ngStorage', 'ngWebsocket']);

(function(app, options){
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
			base_controller.ws_do_action($scope, 'list_meetings', {});

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
			if( $scope.meeting.player_id ){
				data.player_id = $scope.meeting.player_id;
			}
			$scope.ws.$emit(action, data);
		},
		ws_send_message: function($scope, message){
			$scope.ws.$emit('message', message);
		},

		/* Local Storage handling */
		ls_set_storage_type: function($scope, use_local){
			log_o('user', $scope.user);
			if( use_local ){
				$scope.storage = $scope.local_store;
				$scope.use_local_storage = true;
			}else{
				$scope.storage = $scope.session_store;
				$scope.use_local_storage = false;
			}
		},

		/* Update */
		update_status: function($scope, data){
			log_o( 'updating status', data );
			log_o('before', $scope.meeting);
			$scope.$apply(function(){
				$scope.meeting.meeting_id = data.meeting;
				$scope.meeting.player_id = data.player;
				$scope.storage.player_id = data.player;
				$scope.meeting.meeting_name = data.data.meeting;
				$scope.meeting.host_name = data.data.host;
				$scope.meeting.players = data.data.players;
				$scope.meeting.issue = data.data.issue;
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
				player_id: $scope.storage.pp_player_id,
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
				logged_in: $scope.storage.pp_dispname ? true : false,
				name: $scope.storage.pp_dispname
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

		join_meeting: function($scope, meeting_id) {

		}
	};



	app.controller('AppController', ['$scope', '$localStorage', '$sessionStorage', '$websocket', function($scope, $localStorage, $sessionStorage, $websocket){

		var default_vals = {
			pp_use_local: true,
			pp_dispname: '',
			pp_player_id: false
		};
		$scope.local_store = $localStorage.$default(default_vals);
		$scope.session_store = $sessionStorage.$default(default_vals);

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
		this.send_message = function(message) {
			return base_controller.ws_send_message($scope, message);
		};

		$scope.set_storage_type = function(use_local){
			log_o('set_storage_type', use_local);
			return base_controller.ls_set_storage_type($scope, use_local)
		};
		$scope.set_storage_type($scope.local_store.pk_use_local);

		$scope.update_status = function(event, data){
			//base_controller.update_status($scope, data);
		};

		$scope.$on('pp_update_status', function(event, data){
			base_controller.update_status($scope, data);
		});

		$scope.meeting = base_controller.get_initial_status($scope);
		$scope.user = base_controller.get_initial_user($scope);
		$scope.update_meetings_list = function(data){
			return base_controller.update_meetings_list($scope, data);
		};
		$scope.action_data = {};
		$scope.meetings_list = [];

		log_o('$scope.user', $scope.user);
		log_o('$scope.meeting', $scope.meeting);
		this.join_meeting = function(meeting_id){
			$scope.do_action('join_meeting', {
				meeting_id: meeting_id,
				player_name: $scope.storage.pp_dispname
			});
		};
		this.create_meeting = function(){
			base_controller.create_meeting($scope);
		};

	}]);

})(app, options);





