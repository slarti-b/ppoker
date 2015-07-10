"use strict";

app.controller('LoginController', ['$scope', function ($scope){

    this.do_login = function(){
        $scope.storage.set_storage_type($scope.storage.use_local);
        var data = {};
        log_o('$scope', $scope);
        if( $scope.play_as_guest ) {
            log('guest login');
            data = {
                play_as_guest: true,
                player_name:   $scope.dispname
            };
        } else {
            log('user login');
            data = {
                play_as_guest: false,
                username: $scope.username,
                password: $scope.password
            };
        }
        $scope.do_action('login', data);
    };
}]);

