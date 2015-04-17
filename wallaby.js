module.exports = function () {
	'use strict';

	// Export
	return {
		files: [
			{pattern: 'vendors/url.js', instrument: false},
			{pattern: 'vendors/require.js', instrument: false},
			{pattern: 'tests/wallaby.boot.js', instrument: false},
			//{pattern: 'tests/index.html', instrument: false},
			{pattern: 'tests/urls.js', load: false},
			{pattern: 'src/url.js', load: false},
			{pattern: 'src/querystring.js', load: false},
		],

		tests: [
			{pattern: 'tests/url.tests.js', load: false},
			{pattern: 'tests/querystring.tests.js', load: false},
		],

		debug: true,

		testFramework: 'qunit@1.16.0'
	};
};
