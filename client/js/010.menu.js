"use strict";

app.controller('MenuController', ['$scope', function($scope){
	var menu = this;
	menu.menu_items = {};

	menu.update_menu_items = function($scope){
		menu.menu_items = {};
		if( $scope.meeting.is_host ){
			menu.menu_items.show_cards = {
				text: 'Show Cards',
				action: function($scope){
					$scope.do_action('show_cards');
				},
				disabled: !$scope.meeting.all_chosen
			};
			menu.menu_items.change_issue = {
				text: 'Change Issue',
				action: 'set_issue',
				disabled: false
			};
			menu.menu_items.end_meeting = {
				text: 'End Meeting',
				action: 'end_meeting',
				disabled: false
			};
		} else if( $scope.meeting.meeting_id ) {
			menu.menu_items.leave_meeting = {
				text: 'Leave Meeting',
				action: 'leave_meeting',
				disabled: false
			};
		}
		menu.menu_items.logout = {
			text: 'Logout',
			action: 'logout',
			disabled: false
		};
	};

	menu.update_menu_items($scope);

	$scope.$on('pp_status_updated', function(){
		menu.update_menu_items($scope);
	});

	menu.logout = function() {
		$scope.logout();
	};

	menu.onclick = function($event, $menu_item){
		if( $menu_item.disabled ){
			log_o('disabled', $menu_item);
		}else {
			log_o('action', $menu_item);
			if( typeof $menu_item.action === 'function' ) {
				$menu_item.action($scope);
			} else if( typeof menu[ $menu_item.action ] === 'function' ) {
				menu[ $menu_item.action ]($scope);
			} else {
				$scope.do_action($menu_item.action);
			}
		}
		$event.preventDefault();
		$event.stopPropagation();
	}
}]);
