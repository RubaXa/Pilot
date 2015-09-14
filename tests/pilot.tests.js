define(['pilot'], function (Pilot) {
	module('Pilot');

	var TYPES = {
		'inbox': 1,
		'spam': 2
	};


	var app = window.app = Pilot.create({
		'#idx': {
			url: '/',
			model: {
				indexes: function () {
					return 123;
				}
			},
			'on:route': function () {
				this.ok = true;
			}
		},

		'#foo': {
			url: '/:foo',

			'*': {
				'region': {
					match: ['#baz'],
					'on:routestart': function () {
						this.foo = 'start';
					},
					'on:routeend': function () {
						this.foo = 'end';
					}
				}
			},

			model: {
				data: function (req) {
					return req.params.foo;
				}
			},

			'#bar': {
				url: 'bar'
			},

			'#baz': {
				url: './baz',
				model: {
					subdata: function () {
						return 'baz';
					}
				}
			}
		},

		'#folder': {
			url: '/:folder?'
		},

		'#letters': {
			url: {
				pattern: '/messages/(:type|folder/:id)?',
				params: {
					type: {
						decode: function (value, req) {
							req.params.id = TYPES[value] || 0;
							return value;
						}
					},
					id: {
						validate: function (value) {
							return value >= 0;
						},
						decode: function (value) {
							return parseInt(value, 10);
						}
					}
				},
				toUrl: function (params, builder) {
					if (!(params instanceof Object)) {
						params = params >= 0 ? {id: params} : {type: params};
					}

					if (params.id === 0) {
						params.type = 'inbox';
					}

					return builder(params);
				}
			}
		}
	});


	test('routes', function () {
		deepEqual(app.routes.map(function (route) {
			return {id: route.id, url: route.url.pattern, group: route.__group__};
		}), [
			{"id": "#__root__", "url": "/", "group": true},
			{"id": "#idx", "url": "/", "group": false},
			{"id": "#foo", "url": "/:foo", "group": true},
			{"id": "#bar", "url": "/:foo/bar", "group": false},
			{"id": "#baz", "url": "/:foo/baz", "group": false},
			{"id": "#folder", "url": "/:folder?", "group": false},
			{"id": "#letters", "url": "/messages/(:type|folder/:id)?", "group": false}
		], 'routes');
	});


	promiseTest('nav', function () {
		equal(app['#foo'].regions.length, 1);
		deepEqual(app.model, {});
		deepEqual(app['#idx'].model, {indexes: void 0});

		return app.nav('/').then(function () {
			equal(app.route.id, '#idx');
			equal(app.url.href, app.request.href);
			equal(app.request.path, '/');

			ok(app['#idx'].active, '#idx.active');
			ok(app['#idx'].ok, '#idx.ok');
			ok(!app['#foo'].active, '#foo.active');

			deepEqual(app.model, {}, 'app.model');
			deepEqual(app.route.model, {indexes: 123}, 'idx.model');

			return app.nav('/xxx/bar').then(function () {
				equal(app.route.id, '#bar');
				equal(app.request.path, '/xxx/bar');

				return app.nav('/yyy/baz/').then(function () {
					ok(app['#foo'].active, '#foo.active');
					equal(app.route.id, '#baz');
					equal(app['#foo'].regions[0].foo, 'start');

					deepEqual(app['#idx'].model, {indexes: void 0});
					deepEqual(app['#foo'].model, {data: 'yyy'});
					deepEqual(app.route.model, {data: 'yyy', subdata: 'baz'});

					return app.nav('/zzz/bar/').then(function () {
						equal(app['#foo'].regions[0].foo, 'end');
					});
				});
			});
		});
	});


	test('getUrl', function () {
		equal(app.getUrl('#folder'), '/');
		equal(app.getUrl('#folder', {folder: 0}), '/0/');

		equal(app.getUrl('#letters'), '/messages/');
		equal(app.getUrl('#letters', {type: 'inbox'}), '/messages/inbox/');
		equal(app.getUrl('#letters', {id: 2}), '/messages/folder/2/');
		equal(app.getUrl('#letters', 'inbox'), '/messages/inbox/');
		equal(app.getUrl('#letters', 2), '/messages/folder/2/');
		equal(app.getUrl('#letters', 0), '/messages/inbox/');
		equal(app.getUrl('#letters', {id: 0}), '/messages/inbox/');
	});


	promiseTest('letters', function () {
		return app.go('#letters', {type: 'inbox'}).then(function () {
			deepEqual(app.route.params, {id: 1, type: 'inbox'});

			return app.go('#letters', {id: 2}).then(function () {
				deepEqual(app.route.params, {id: 2});

				return app.go('#letters', {id: 'str'}).then(function () {
					ok(false, 'catch')
				}, function (err) {
					equal(err.code, 404);
					deepEqual(app.route.params, {id: 2});
				});
			});
		});
	});
});
