"use strict";

(function(app, options) {
	var bid_controller = {
		possible_bids: [
			{
				value: 0.5,
				text: '0.5'
			},
			{
				value: 1,
				text: '1'
			},
			{
				value: 2,
				text: '2'
			},
			{
				value: 3,
				text: '3'
			},
			{
				value: 5,
				text: '5'
			},
			{
				value: 8,
				text: '8'
			},
			{
				value: 13,
				text: '13'
			},
			{
				value: 21,
				text: '11'
			},
			{
				value: 44,
				text: '44'
			},
			{
				value: '?',
				text: '?'
			}
		],

		make_bid: function(event, bid){
			log_o('bid', bid);
			bid_controller.$scope.do_action('set_bid', {
				bid: bid
			});
		}
	};

	app.controller('BidController', ['$scope', '$localStorage', '$sessionStorage', '$websocket', function($scope, $localStorage, $sessionStorage, $websocket) {
		bid_controller.$scope = $scope;
		this.possible_bids = bid_controller.possible_bids;
		this.make_bid = bid_controller.make_bid;
	}]);
	
})(app, options);
