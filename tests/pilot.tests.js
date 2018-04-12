define(['../src/pilot'], function (Pilot) {
	QUnit.module('Pilot');

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
						decode: function (value, req) {
							// req.params.type = ID_TYPES[value];
							return parseInt(value, 10);
						}
					}
				},
				toUrl: function (params, query, builder) {
					if (!(params instanceof Object)) {
						params = params >= 0 ? {id: params} : {type: params};
					}

					if (params.id === 0) {
						params.type = 'inbox';
					}

					return builder(params, query);
				}
			}
		}
	});


	QUnit.test('routes', function (assert) {
		assert.deepEqual(app.routes.map(function (route) {
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

	QUnit.promiseTest('nav', function (assert) {
		assert.equal(app['#foo'].regions.length, 1);
		assert.deepEqual(app.model, {});
		assert.deepEqual(app['#idx'].model, {indexes: void 0}, 'initial');

		var replaceState = false;

		app.one('routeend', (evt) => {
			replaceState = evt.details.replaceState;
		});

		return app.nav('/', {replaceState: true}).then(function () {
			assert.ok(replaceState);
			assert.equal(app.route.id, '#idx');
			assert.equal(app.url.href, app.request.href);
			assert.equal(app.request.path, '/');

			assert.ok(app['#idx'].active, '#idx.active');
			assert.ok(app['#idx'].ok, '#idx.ok');
			assert.ok(!app['#foo'].active, '#foo.active');

			assert.deepEqual(app.model, {}, 'app.model');
			assert.deepEqual(app.route.model, {indexes: 123}, 'idx.model');

			return app.nav('/xxx/bar').then(function () {
				assert.equal(app.route.id, '#bar');
				assert.equal(app.request.path, '/xxx/bar');

				return app.nav('/yyy/baz/').then(function () {
					assert.ok(app['#foo'].active, '#foo.active');
					assert.equal(app.route.id, '#baz');
					assert.equal(app['#foo'].regions[0].foo, 'start');

					assert.deepEqual(app['#idx'].model, {indexes: void 0});
					assert.deepEqual(app['#foo'].model, {data: 'yyy'});
					assert.deepEqual(app.route.model, {data: 'yyy', subdata: 'baz'});

					return app.nav('/zzz/bar/').then(function () {
						assert.equal(app['#foo'].regions[0].foo, 'end');
					});
				});
			});
		});
	});

	QUnit.test('getUrl', function (assert) {
		assert.equal(app.getUrl('#folder'), '/');
		assert.equal(app.getUrl('#folder', {folder: 0}), '/0/');

		assert.equal(app.getUrl('#letters'), '/messages/');
		assert.equal(app.getUrl('#letters', {type: 'inbox'}), '/messages/inbox/');
		assert.equal(app.getUrl('#letters', {id: 2}), '/messages/folder/2/');
		assert.equal(app.getUrl('#letters', 'inbox'), '/messages/inbox/');
		assert.equal(app.getUrl('#letters', 2), '/messages/folder/2/');
		assert.equal(app.getUrl('#letters', 0), '/messages/inbox/');
		assert.equal(app.getUrl('#letters', {id: 0}), '/messages/inbox/');
		assert.equal(app.getUrl('#letters', {id: 0}, {foo: 'bar'}), '/messages/inbox/?foo=bar');
	});

	QUnit.promiseTest('getUrl: inherit query', function (assert) {
		return app.nav('/?foo&bar=Y').then(function () {
			assert.equal(app.getUrl('#letters', {}, 'inherit'), '/messages/?foo&bar=Y');
		});
	});

	QUnit.promiseTest('letters', function (assert) {
		return app.go('#letters', {type: 'inbox'}).then(function () {
			assert.deepEqual(app.route.params, {id: 1, type: 'inbox'}, 'id + type');

			return app.go('#letters', {id: 2}).then(function () {
				assert.deepEqual(app.route.params, {id: 2}, 'id');

				return app.go('#letters', {id: 'str'}).then(function () {
					assert.ok(false, 'catch')
				}, function (err) {
					assert.equal(err.code, 404);
					assert.deepEqual(app.route.params, {id: 2}, '404');
				});
			});
		});
	});

	QUnit.promiseTest('search/query', function (assert) {
		var query;
		var app = Pilot.create({
			model: {
				results: function (req) {
					query = req.query;
				}
			},

			'#index': {
				url: {
					pattern: '/:folder',
					params: {folder: {validate: function (value) { return value !== 'search'; }}}
				}
			},

			'#search': {
				url: '/search/'
			}
		});

		return app.nav('/search/?find=foo').then(function () {
			assert.deepEqual(query, {find: 'foo'});
		});
	});

	QUnit.promiseTest('race condition', function (assert) {
		var log = [];
		var loader = new Pilot.Loader({
			value: function (req) {
				return sleep(req.params.time);
			}
		}, {
			persist: true,
			processing: function (req, model) {
				log.push(model.value)
				return model;
			},
		})
		var race = Pilot.create({
			model: loader,
			'#index': {url: '/:time'}
		});

		race.nav('/100');
		race.nav('/50');
		race.nav('/80');
		race.nav('/30');
		race.nav('/80');

		setTimeout(function () {
			loader.fetch();
		}, 60);

		return sleep(110).then(function () {
			assert.deepEqual(log, ['50']);
		});
	});

	QUnit.promiseTest('force', function (assert) {
		var navigated = 0;

		var handleRoute = function () {
			navigated++;
		};

		return app.go('#letters', {type: 'inbox'}).then(function () {
			app.on('route', handleRoute);

			// Сейчас не перейдёт
			return app.go('#letters', {type: 'inbox'});
		}).then(function () {
			assert.equal(navigated, 0);

			// А сейчас перейдёт
			return app.go('#letters', {type: 'inbox'}, null, {force: true});
		}).then(function () {
			assert.equal(navigated, 1);
			app.off('route', handleRoute);
		});
	});

	function sleep(time) {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(time);
			}, time)
		})
	}
});
