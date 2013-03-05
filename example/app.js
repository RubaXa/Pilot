(function ($){
	var config = {
		flickrKey: '17b8e2ab0fd555ec614c32896a017a91'
	};


	/**
	 * Pilot application
	 */
	var App = Pilot.extend({
		/**
		 * Flickr api
		 *
		 * @param	{String}	method	-- flickr api method
		 * @param	{Object}	params  -- additional parameters ajax request
		 * @return	{$.Deffered}
		 */
		flickr: function (method, params){
			return $.ajax({
				  url: 'http://api.flickr.com/services/rest/'
				, data: $.extend({ method: method, api_key: config.flickrKey, format: 'json' }, params)
				, dataType: 'jsonp'
				, jsonpCallback: 'jsonFlickrApi'
			});
		}
	});


	/**
	 * @class	App.location
	 */
	App.location = Pilot.View.extend({
		// Delegate events
		events: {
			  'click .js-back': 'onBack'
			, 'click .js-forward': 'onForward'
		},

		loadData: function (){
			this.$('.js-spinner').show();
		},

		onRoute: function (evt, req){
			var router = this.router;
			this.$('.js-spinner').hide();
			this.$('.js-address').html(req.path);
			this.$('.js-back').toggleClass('app__location__nav_active', router.hasBack());
			this.$('.js-forward').toggleClass('app__location__nav_active', router.hasForward());
		},

		onBack: function (){
			this.router.back();
		},

		onForward: function (){
			this.router.forward();
		}
	});


	/**
	 * @class	App.index
	 */
	App.index = Pilot.View.extend({
		tag: '#app-view div.app__index',
		template: function (){
			var router = this.router;
			// Navigation
			return ['<a href="'+router.getUrl('gallery', { tag: 'cubism' })+'">cubism</a>'
				, '<a href="'+router.getUrl('gallery', { tag: 'impressionism' })+'">impressionism</a>'
				, '<a href="'+router.getUrl('gallery', { tag: 'neoclassicism' })+'">neoclassicism</a>'
			].join('<br/>');
		},
		init: function (){
			this.render();
		}
	});


	/**
	 * @class	App.gallery
	 */
	App.gallery = Pilot.View.extend({
		tag: '#app-view div.app__gallery',
		grid: { 6: 150, 12: 110, 20: 85 },

		template: function (photoset){
			var params	= this.request.params;
			var tag		= params.tag;
			var router	= this.router;
			var width	= this.grid[params.perPage||12];

			var html	= $.map(photoset, function (photo){
				var url = router.getUrl('artwork', { id: photo.id });
				return '<a href="'+url+'"><img class="app__img" width="'+width+'" src="'+photo.url_q+'" /></a>';
			}).join('');

			html += '<div class="app__perPage">per page:'
				 +  '  <a href="'+router.getUrl('gallery', { perPage: 6, tag: tag })+'">6</a>'
				 +  ', <a href="'+router.getUrl('gallery', { perPage: 12, tag: tag })+'">12</a>'
				 +  ', <a href="'+router.getUrl('gallery', { perPage: 20, tag: tag })+'">20</a>'
				 +  '</div>'
				 +  '<div class="app__paginator">paginator:'
				 +  '  <a href="'+router.getUrl('gallery', params, { page: 1 })+'">1</a>'
				 +  ', <a href="'+router.getUrl('gallery', params, { page: 2 })+'">2</a>'
				 +  ', <a href="'+router.getUrl('gallery', params, { page: 3 })+'">3</a>'
				 +  '</div>'
			;
			return	html;
		},

		loadData: function (req){
			var key = req.path;
			if( this._cacheKey != key ){
				this._cacheKey = key;

				return this.router.flickr('flickr.photos.search', {
					  page:		req.params.page || 1
					, per_page:	req.params.perPage || 12
					, extras:	'url_q'
					, tags:		req.params.tag
				}).done(this.bound(function (data){
					// Set photolist
					this.setData(data.photos.photo);
				}));
			}
		},

		onRoute: function (){
			this.render();
		}
	});



	/**
	 * @class	App.gallery.artwork
	 */
	App.gallery.artwork = Pilot.View.extend({
		tag: '#app-view div.app__photo',
		patternSrc: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_b.jpg',

		template: function (photo){
			var src = this.getSrc(photo);
			return '<img src="'+src+'" width="100%"/>';
		},

		loadData: function (req){
			var df = $.Deferred();
			this.router
				.flickr('flickr.photos.getInfo', { photo_id: req.params.id })
				.done(this.bound(function (res){
					this.setData(res.photo);
					$(new Image)
						.attr('src', this.getSrc(res.photo))
						.load(df.resolve)
					;
				}))
			;
			return	df;
		},

		getSrc: function (photo){
			return this.patternSrc.replace(/\{([^}]+)\}/g, function (_, key){
				return photo[key];
			});
		},

		onRoute: function (){
			this.render();
		}
	});



	/**
	 * Build & run app
	 */
	new App({ el: '#app-view' })
		.route('*', App.location, { el: '#app-location' })
		.route('index', '/', App.index)
		.route('gallery', '/gallery/:tag/:perPage?(/page/:page)?', App.gallery)
		.route('artwork', '/artwork/:id', App.gallery.artwork)
		.nav('/')
	;
})(jQuery);
