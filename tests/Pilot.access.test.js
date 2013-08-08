/*jslint curly: false */
/*global Pilot, module, test, equal*/

/**
 *       ~~~ TESTS ~~~
 */
module('Pilot.access');


test('auth', function (){
	var log = [];
	var authFlag = false;
	var router = new Pilot;


	Pilot.access['auth'] = function (){
		return	authFlag;
	};


	Pilot.access['no-auth'] = function (){
		return	!authFlag;
	};


	router
		.route('/search/', {
			accessPermission: 'auth',
			accessDeniedRedirectTo: '/login/'
		})
		.route('/login/', {
			accessPermission: 'no-auth',
			accessDeniedRedirectTo: '/welcome/',
			onRouteStart: function (){ authFlag = true; }
		})
		.on('route', function (evt, req){
			log.push(req.path);
		})
	;

	router.nav('/');

	log.push('search?');
	router.nav('/search/');
	router.nav('/search/');

	log.push('login?');
	router.nav('/login/');

	equal(log.join(' -> '), '/ -> search? -> /login/ -> /search/ -> login? -> /welcome/');
});


test('owner', function (){
	var log = [];
	var authUserId = 123;

	Pilot.access['owner'] = function (req){
		return	req.params.id == authUserId;
	};

	var router = new Pilot;

	router
		.on('route', function (evt, req){ log.push(req.path); })
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


	equal(
	  log.join(' -> ')
	, '/user/123/ -> /user/321/ -> ' +
			'/user/123/edit/ -> /user/321/ -> ' +
			'/user/123/settings/ -> /user/321/'
	);
});


test('redirectToFn', function (){
	var log = [];
	var router = new Pilot;

	router
		.on('route', function (evt, req){ log.push(req.path); })
		.route('/to/:id/', {
			accessPermission: false,
			accessDeniedRedirectTo: function (req){
				return '/done/'+req.params.id+'/';
			}
		})
		.route('/done/:id/')
	;

	router.nav('/to/1/');
	router.nav('/to/2/');
	router.nav('/done/3/');

	equal(log.join(' -> '), '/done/1/ -> /done/2/ -> /done/3/');
});
