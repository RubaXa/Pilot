(function ($, Pilot) {
	var App = Pilot.create({
		el: '#app', // root view

		subviews: {
			/**
			 * Show loading indicator on each query.
			 */
			loading: {
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
			}
		},


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

			loadData: function (req) {
				return $.flickr('flickr.photos.search', {
					tags: req.params.name,
					page: req.params.page|0,
					extras: 'url_q',
					per_page: 50
				}).then(function (result) {
					return result.photos;
				});
			},

			/**
			 * Is similar to `routestart` and `routechange`.
			 * @param  {$.Event}  evt
			 * @param  {Pilot.Request}  req
			 */
			onRoute: function (evt, req) {
				this.$('.js-title').text(req.params.name);

				var photos = this.getLoadedData();

				this.$('.js-photos').html(photos.photo.map(function (photo) {
					return '<a><img src="'+ photo.url_q +'" /></a>';
				}, this));
			}
		}


	});


	// Run app
	App.start('/');
})(jQuery, Pilot);

