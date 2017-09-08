/*jslint curly: false */
/*global jQuery, Pilot, module, test, equal*/

/**
 *       ~~~ TESTS ~~~
 */
QUnit.module('Pilot.access');


QUnit.test('auth', function (assert) {
	var log = [];
	var authFlag = false;
	var router = new Pilot;


	Pilot.access['auth'] = function () {
		return authFlag;
	};


	Pilot.access['no-auth'] = function () {
		return !authFlag;
	};


	router
		.route('/search/', {
			accessPermission: 'auth',
			accessDeniedRedirectTo: '/login/'
		})
		.route('/login/', {
			accessPermission: 'no-auth',
			accessDeniedRedirectTo: '/welcome/',
			onRouteStart: function () {
				authFlag = true;
			}
		})
		.on('route', function (evt, req) {
			log.push(req.path);
		})
	;

	router.nav('/');

	log.push('search?');
	router.nav('/search/');
	router.nav('/search/');

	log.push('login?');
	router.nav('/login/');

	assert.equal(log.join(' -> '), '/ -> search? -> /login/ -> /search/ -> login? -> /welcome/');
});


QUnit.test('owner', function (assert) {
	var log = [];
	var authUserId = 123;

	Pilot.access['owner'] = function (req) {
		return req.params.id == authUserId;
	};

	var router = new Pilot;

	router
		.on('route', function (evt, req) {
			log.push(req.path);
		})
		.route('user', '/user/:id/', {})
		.route('user-edit', '/user/:id/edit/', {
			accessPermission: 'owner'
			, accessDeniedRedirectTo: '..'
		})
		.route('user-settings', '/user/:id/settings/', {
			accessPermission: 'owner'
			, accessDeniedRedirectTo: 'user'
		})
	;

	router.nav('/user/123/');
	router.nav('/user/321/');

	router.nav('/user/123/edit/');
	router.nav('/user/321/edit/');

	router.nav('/user/123/settings/');
	router.nav('/user/321/settings/');


	assert.equal(log.join(' -> '),
		'/user/123/ -> /user/321/ -> ' +
		'/user/123/edit/ -> /user/321/ -> ' +
		'/user/123/settings/ -> /user/321/'
	);
});


QUnit.test('redirectToFn', function (assert) {
	var log = [];
	var router = new Pilot;

	router
		.on('route', function (evt, req) {
			log.push(req.path);
		})
		.route('/to/:id/', {
			accessPermission: false,
			accessDeniedRedirectTo: function (req) {
				return '/done/' + req.params.id + '/';
			}
		})
		.route('/done/:id/')
	;

	router.nav('/to/1/');
	router.nav('/to/2/');
	router.nav('/done/3/');

	assert.equal(log.join(' -> '), '/done/1/ -> /done/2/ -> /done/3/');
});


QUnit.test('deferrer', function (assert) {
	var log = [];
	var router = new Pilot;

	Pilot.access['promise'] = function (req) {
		return jQuery.Deferred()[/public/.test(req.path) ? 'resolve' : 'reject']();
	};

	router
		.on('route', function (evt, req) {
			return log.push(req.path);
		})
		.route('/public/', {
			accessPermission: 'promise',
			accessDeniedRedirectTo: '/'
		})
		.route('/private/', {
			accessPermission: 'promise',
			accessDeniedRedirectTo: '/'
		})
		.route('/public/closed/', {
			loadData: function () {
				return jQuery.Deferred().reject({redirectTo: '/public/'});
			}
		})
	;

	router.nav('/public/');
	router.nav('/private/');
	router.nav('/public/closed/');

	assert.equal(log.join(' -> '), '/public/ -> / -> /public/');
});
