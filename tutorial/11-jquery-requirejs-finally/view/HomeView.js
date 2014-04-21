define(['view/DefaultView'], function (DefaultView) {
	/**
	 * @class HomeView
	 * @extends DefaultView
	 */
	var HomeView = DefaultView.extend(/** @lends HomeView.prototype */{
		/**
		 * This method should be called once before `init`, `routestart` or `routechange`
		 * @param   {Pilot.Request}  req
		 * @returns {$.Deferred}
		 */
		loadDataOnce: function (req) {
			return $.getJSON('./data/galleries.json');
		},

		/**
		 * Will be called once at the time of initialization of the route
		 */
		init: function () {
			// Retrieve a loaded data
			var galleries = this.getLoadedData();

			// Set a header screen
			this.setTitle('List of art movements');

			// Build the list
			this.setHtml('list', galleries.map(function (name) {
				var url = this.getUrl('gallery', { name: name });
				return '<li class="table-view-cell"><a href="' + url + '">' + name + '</a></li>';
			}, this));
		}
	});

	// Export
	return HomeView;
});
