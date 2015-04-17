wallaby.delayStart();

requirejs.config({
	baseUrl: '../src/',
	paths: {
		tests: '../tests/'
	},
	deps: wallaby.tests,
	callback: wallaby.start
});
