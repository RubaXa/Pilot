(function ($, Pilot) {
	var App = Pilot.create({
		el: '#app', // root view


		// Home screen
		'/': {
			// Route id
			id: 'home',

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
				this.$('.js-title').text('List of art movements');

				// Build the list
				this.$('.js-list').append(galleries.map(function (name) {
					var url = this.getUrl('gallery', { name: name });
					return '<li class="table-view-cell"><a href="'+url+'">'+name+'</a></li>';
				}, this));
			}
		},


		// Gallery screen
		'/gallery/:name/': {
			id: 'gallery',

			/**
			 * Is similar to `routestart` and `routechange`.
			 * @param  {$.Event}  evt
			 * @param  {Pilot.Request}  req
			 */
			onRoute: function (evt, req) {
				this.$('.title').text(req.params.name);
			}
		}


	});


	// Run app
	App.start('/');
})(jQuery, Pilot);

