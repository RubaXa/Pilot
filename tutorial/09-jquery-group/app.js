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
			toggleEffect: 'fadeIn',

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


		// Gallery & Artwork group
		'/gallery/': {
			id: 'gallery-group',
			toggleEffect: 'transition',


			// Gallery screen
			'/:name/:page?': {
				id: 'gallery',
				toggleEffect: 'show',

				paramsRules: {
					name: function (val) {
						return val != 'artwork';
					}
				},

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
					var name = req.params.name,
						photos = this.getLoadedData()
					;

					this.$('.js-title').text(name);
					this.$('.js-content').scrollTop(0);

					this.$('.js-photos').html(photos.photo.map(function (photo) {
						var url = this.getUrl('artwork', { id: photo.id });
						return '<a href="' + url + '"><img src="' + photo.url_q + '" /></a>';
					}, this));

					var paginator = [],
						page = Math.max(photos.page - 4, 1),
						pages = Math.min(page + 10, photos.pages),
						url
					;

					for (; page < pages; page++) {
						if (page == photos.page) {
							paginator.push('<span class="badge badge-positive">' + page + '</span>');
						} else {
							url = this.getUrl('gallery', { name: name, page: page });
							paginator.push('<a href="!#' + url + '" class="badge">' + page + '</a>');
						}
					}

					this.$('.js-paginator').html(paginator.join(' '));
				}
			},


			// Artwork screen
			'/artwork/:id/': {
				id: 'artwork',
				toggleEffect: 'transition',

				loadData: function (req) {
					return $.flickr('flickr.photos.getInfo', { photo_id: req.params.id }).then(function (res) {
						var dfd = $.Deferred(),
							photo = res.photo,
							srcTpl = '//farm{farm}.static.flickr.com/{server}/{id}_{secret}_b.jpg'
						;

						// Preload image
						$(new Image)
							.attr('src', srcTpl.replace(/\{(.*?)\}/g, function (_, key) {
								return photo[key];
							}))
							.one('load', function () {
								dfd.resolve({
									el: this,
									photo: photo
								});
							})
						;

						return dfd;
					});
				},

				onRoute: function (evt, req) {
					var data = this.getLoadedData(),
						owner = data.photo.owner
					;

					this.$('.js-back').prop('href', req.referrer);
					this.$('.js-title').text(owner.realname || owner.username);
					this.$('.js-content').html(data.el);
				}
			}
		}


	});


	// Run app
	App.start('/');
})(jQuery, Pilot);
