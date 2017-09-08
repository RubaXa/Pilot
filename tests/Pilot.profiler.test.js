/*global Pilot, module, test, equal*/

QUnit.module('Pilot.profiler');

QUnit.test('profiler', function (assert) {
	function sleep(ms){
		var start = new Date;
		while( new Date - start < ms ){}
	}


	var log = [];
	var Router = new Pilot({ profile: true });

	Router.on('profile', function (){
		log.push('ok');
	});


	Router.route('index', '/', {
		init: function (){
			sleep(2);
		},
		loadData: function (){
			sleep(7);
		},
		onRouteStart: function (){
			sleep(5);
		},
		onRoute: function (){
			sleep(9);
		},
		onRouteEnd: function (){
			sleep(20);
		}
	});

	Router.route('help', '/:page', {
		subroutes: {
			menu: Pilot.Route.extend({
				loadData: function (){ sleep(3); },
				onRoute: function (){ sleep(50); }
			})
		},

		loadData: function (){
			sleep(8);
		},
		onRouteStart: function (){
			sleep(5);
		}
	});

	Router.on('route', function (){
		sleep(12);
	});

	Router.nav('/');
	Router.nav('/help/');


	assert.equal(log.join('-'), 'ok-ok');
});
