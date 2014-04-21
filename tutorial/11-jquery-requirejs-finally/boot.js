require.config({
	baseUrl: './',
	shim: {
		Pilot: {
			deps: ['jquery']
		}
	},
	paths: {
		jquery: '//code.jquery.com/jquery-2.1.0.min',
		Pilot: '../../Pilot'
	}
});


// Run App
require(['app'], function (App) {
	App.start('/');
});
