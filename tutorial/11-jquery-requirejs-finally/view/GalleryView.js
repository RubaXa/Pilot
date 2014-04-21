define(['view/DefaultView'], function (DefaultView) {
	/**
	 * @class GalleryView
	 * @extends DefaultView
	 */
	var GalleryView = DefaultView.extend(/** @lends GalleryView.prototype */{
		paramsRules: {
			name: function (val) {
				return val != 'artwork';
			}
		},

		loadData: function (req) {
			return $.flickr('flickr.photos.search', {
				tags: req.params.name,
				page: req.params.page | 0,
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

			this.setTitle(name);
			this.setScrollTop(0);

			this.setHtml('photos', photos.photo.map(function (photo) {
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
					paginator.push('<a href="' + url + '" class="badge">' + page + '</a>');
				}
			}

			this.setHtml('paginator', paginator.join(' '));
		}
	});

	// Export
	return GalleryView;
});
