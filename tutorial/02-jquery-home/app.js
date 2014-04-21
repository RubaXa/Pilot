(function ($, Pilot) {
	var App = Pilot.create({
		el: '#app', // root view


		// Home screen
		'/': {
			// Route id
			id: 'home',

			/**
			 * This method should be called before `init`, `routestart` or `routechange`
			 * @param   {Pilot.Request}  req
			 * @returns {$.Deferred}
			 */
			loadData: function (req) {
				return $.getJSON('./data/galleries.json');
			},

			/**
			 * Will be called once at the time of initialization of the route
			 */
			init: function () {
				// Retrieve a loaded data
				var galleries = this.getLoadedData();

				// Set a header screen
				this.$('.js-title').text('List of art movements');

				// Build the list
				this.$('.js-list').append(galleries.map(function (name) {
					return '<li class="table-view-cell"><a>'+name+'</a></li>';
				}, this));
			}
		}


	});


	// Run app
	App.start('/');
})(jQuery, Pilot);
