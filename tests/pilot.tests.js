define(['pilot'], function (Pilot) {
	module('Pilot');


	var app = window.app = Pilot.create({
		'#idx': {
			url: '/',
			model: {
				indexes: function () {
					return 123;
				}
			}
		},

		'#foo': {
			url: '/:foo',
			model: {
				data: function (req) {
					return req.params.foo;
				}
			},

			'#bar': {url: 'bar'},

			'#baz': {
				url: './baz',
				model: {
					subdata: function () {
						return 'baz';
					}
				}
			}
		}
	});


	test('routes', function () {
		deepEqual(app.routes.map(function (route) {
			return {id: route.id, url: route.url.pattern, group: route.__group__};
		}), [
			{"id": "#idx", "url": "/", "group": false},
			{"id": "#foo", "url": "/:foo", "group": true},
			{"id": "#bar", "url": "/:foo/bar", "group": false},
			{"id": "#baz", "url": "/:foo/baz", "group": false}
		], 'routes');
	});


	promiseTest('nav', function () {
		deepEqual(app.model, {});
		deepEqual(app['#idx'].model, {indexes: void 0});

		return app.nav('/').then(function () {
			equal(app.route.id, '#idx');
			equal(app.url.href, app.request.href);
			equal(app.request.path, '/');

			ok(app['#idx'].active, '#idx.active');
			ok(!app['#foo'].active, '#foo.active');

			deepEqual(app.model, {}, 'app.model');
			deepEqual(app.route.model, {indexes: 123}, 'idx.model');

			return app.nav('/xxx/bar').then(function () {
				equal(app.route.id, '#bar');
				equal(app.request.path, '/xxx/bar');

				return app.nav('/yyy/baz/').then(function () {
					ok(app['#foo'].active, '#foo.active');
					equal(app.route.id, '#baz');

					deepEqual(app['#idx'].model, {indexes: void 0});
					deepEqual(app['#foo'].model, {data: 'yyy'});
					deepEqual(app.route.model, {data: 'yyy', subdata: 'baz'});
				});
			});
		});
	});
});
