"use strict";

app.controller('LoginController', ['$scope', function ($scope){

    this.do_login = function(arg){
        log_o('arg', arg);
        log_o('$scope.use_local', $scope.use_local);
        log_o('$scope.dispname', $scope.dispname);
        log_o('$scope.user', $scope.user);
        $scope.set_storage_type($scope.use_local);
        $scope.storage.pp_dispname = $scope.dispname;
        $scope.user.logged_in= true;
        $scope.user.name = $scope.dispname;
        log_o('$scope.user', $scope.user);
    };
}]);

