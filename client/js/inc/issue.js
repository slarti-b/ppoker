"use strict";

app.controller('SetIssueContainer', ['$scope', function($scope){
	var issue = this;

	$scope.set_using_jira = function(){
		return $scope.set_using === 'jira';
	};
	$scope.set_using_jira_link = function(){
		return $scope.set_using === 'jira_link';
	};
	$scope.set_manually = function(){
		return $scope.set_using === 'manually';
	};

	$scope.set_using = $scope.user.authenticated ? 'jira' : 'manually';

	issue.set = function(){
		var data = {
			issue_id: $scope.issue_id,
			set_using: $scope.set_using
		};
		if( !$scope.set_using_jira() ){
			data.issue_name = $scope.issue_name;
			data.issue_desc = $scope.issue_desc;
			if( $scope.set_manually() ){
				data.issue_link = $scope.issue_link;
			}
		}

		$scope.do_action('set_issue', data);
		$scope.set_main_board_view();
	}
}]);
