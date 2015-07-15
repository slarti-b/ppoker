"use strict";


(function(app, options) {
	var bid_controller = {
		bids_made: {},
		possible_bids: [
			{
				value: 0.5,
				text: '0.5',
				index_class: 'bid-index-0'
			},
			{
				value: 1,
				text: '1',
				index_class: 'bid-index-1'
			},
			{
				value: 2,
				text: '2',
				index_class: 'bid-index-2'
			},
			{
				value: 3,
				text: '3',
				index_class: 'bid-index-3'
			},
			{
				value: 5,
				text: '5',
				index_class: 'bid-index-4'
			},
			{
				value: 8,
				text: '8',
				index_class: 'bid-index-5'
			},
			{
				value: 13,
				text: '13',
				index_class: 'bid-index-6'
			},
			{
				value: 21,
				text: '11',
				index_class: 'bid-index-7'
			},
			{
				value: 44,
				text: '44',
				index_class: 'bid-index-8'
			},
			{
				value: '?',
				text: '?',
				index_class: 'bid-index-9'
			}
		],

		get_bid_show_index: function(val){
			for( var i in this.possible_bids ){
				if( this.possible_bids[ i ].value == val ){
					return this.possible_bids[ i ].index_class;
				}
			}
		},

		make_bid: function(event, bid){
			log_o('bid', bid);
			bid_controller.$scope.do_action('set_bid', {
				bid: bid,
				issue_id: bid_controller.$scope.meeting.issue.id
			});
		}
	};

	app.controller('BidController', ['$scope', '$localStorage', '$websocket', function($scope, $localStorage, $websocket) {
		bid_controller.$scope = $scope;
		this.possible_bids = bid_controller.possible_bids;
		this.make_bid = bid_controller.make_bid;
		this.get_bid_show_index = bid_controller.get_bid_show_index;
		this.get_bid_classes = function(player){
			return bid_controller.get_bid_show_index(player.bid) + ' bid-pos-'+ player.bid_pos;
		};
	}]);
	
})(app, options);
