(function ($, Pilot) {
	var App = Pilot.create({
		el: '#app', // root view

		subviews: {
			loading: LoadingView
		},


		// Home screen
		'/': {
			// Route id
			id: 'home',
			ctrl: HomeView,
			toggleEffect: 'fadeIn'
		},


		// Gallery & Artwork group
		'/gallery/': {
			id: 'gallery-group',
			toggleEffect: 'transition',


			// Gallery screen
			'/:name/:page?': {
				id: 'gallery',
				ctrl: GalleryView,
				toggleEffect: 'show'
			},


			// Artwork screen
			'/artwork/:id/': {
				id: 'artwork',
				ctrl: ArtworkView,
				toggleEffect: 'transition'
			}
		}


	});


	// Run app
	App.start('/');
})(jQuery, Pilot);
