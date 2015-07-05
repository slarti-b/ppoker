"use strict";

app.controller('MenuController', ['$scope', function($scope){
	var menu = this;
	menu.menu_items = [];

	menu.update_menu_items = function($scope){
		menu.menu_items = [];
		if( $scope.meeting.is_host ){
			menu.menu_items.push( {
				text: 'Change Issue',
				action: function($scope){
					$scope.meeting.board_view = 'set_issue';
					menu.update_menu_items($scope);
				},
				disabled: $scope.show_set_issue(),
				hide: $scope.show_set_issue()
			} );
			menu.menu_items.push( {
				text: 'View Board',
				action: function($scope){
					$scope.meeting.board_view = 'main_board';
					menu.update_menu_items($scope);
				},
				disabled: $scope.show_main_board(),
				hide: $scope.show_main_board()
			} );
			menu.menu_items.push( {
				text: 'Show Cards',
				action: function($scope){
					$scope.do_action('show_cards');
				},
				disabled: !$scope.show_main_board(), // || !$scope.meeting.all_chosen,
				hide: false
			} );
			menu.menu_items.push( {
				text: 'End Meeting',
				action: 'end_meeting',
				disabled: false,
				hide: false
			} );
		} else if( $scope.meeting.meeting_id ) {
			menu.menu_items.push( {
				text: 'Leave Meeting',
				action: 'leave_meeting',
				disabled: false,
				hide: false
			} );
		}
		menu.menu_items.push( {
			text: 'Logout',
			action: 'logout',
			disabled: false,
			hide: false
		} );
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
