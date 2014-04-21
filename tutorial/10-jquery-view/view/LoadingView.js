/**
 * @class LoadingView
 * @extends Pilot.View
 * Show loading indicator on each query.
 */
var LoadingView = Pilot.View.extend(/** @lands LoadingView.prototype */{
	// Before request
	loadData: function () {
		this.$el.stop().delay(100).fadeIn('fast');
	},

	// After request
	onRoute: function () {
		this.$el.stop(true);
		if (this.$el.is(':visible')) {
			this.$el.delay(100).fadeOut('fast');
		}
	}
});
