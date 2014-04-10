define(function (require) {
	var Pilot = require('Pilot');


	var App = Pilot.create({
		el: '#app', // root view

		subviews: {
			loading: require('view/LoadingView')
		},


		// Home screen
		'/': {
			// Route id
			id: 'home',
			ctrl: require('view/HomeView'),
			toggleEffect: 'fadeIn'
		},


		// Gallery & Artwork group
		'/gallery/': {
			id: 'gallery-group',
			toggleEffect: 'transition',


			// Gallery screen
			'/:name/:page?': {
				id: 'gallery',
				ctrl: require('view/GalleryView'),
				toggleEffect: 'show'
			},


			// Artwork screen
			'/artwork/:id/': {
				id: 'artwork',
				ctrl: require('view/ArtworkView'),
				toggleEffect: 'transition'
			}
		}


	});


	// Export
	return App;
});
