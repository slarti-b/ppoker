"use strict";

app.controller('MenuController', ['$scope', function($scope){
	var menu = this;
	menu.menu_items = {};

	menu.update_menu_items = function($scope){
		menu.menu_items = {};
		if( $scope.meeting.is_host ){
			menu.menu_items.show_cards = {
				text: 'Show Cards',
				action: 'show_cards',
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
	};

	menu.update_menu_items($scope);
	$scope.$on('pp_status_updated', function(){
		//$scope.apply(function(){
			menu.update_menu_items($scope);
		//});
	});


	menu.onclick = function($event, $action){
		if( $action.disabled ){
			console.log('disabled');
		}else {
			console.log('action: %o', $action);
		}
		$event.preventDefault();
		$event.stopPropagation();
	}
}]);
