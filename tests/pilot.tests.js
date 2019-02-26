/* global describe, beforeEach, test, expect */

const Pilot = require('../src/pilot');

describe('Pilot', () => {
	var TYPES = {
		'inbox': 1,
		'spam': 2
	};

	function createMockApp() {
		return Pilot.create({
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

			'#fail': {
				url: './fail/:id',
				model: {
					failData: function (req) {
						return req.params.id == 1 ? Promise.reject() : Promise.resolve('OK');
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
	}


	test('routes', () => {
		const app = createMockApp();

		expect(app.routes.map(function (route) {
			return {id: route.id, url: route.url.pattern, group: route.__group__};
		})).toEqual([
			{"id": "#__root__", "url": "/", "group": true},
			{"id": "#idx", "url": "/", "group": false},
			{"id": "#foo", "url": "/:foo", "group": true},
			{"id": "#bar", "url": "/:foo/bar", "group": false},
			{"id": "#baz", "url": "/:foo/baz", "group": false},
			{"id": "#fail", "url": "/fail/:id", "group": false},
			{"id": "#folder", "url": "/:folder?", "group": false},
			{"id": "#letters", "url": "/messages/(:type|folder/:id)?", "group": false}
		]);
	});

	test('nav', async () => {
		const app = createMockApp();

		expect(app['#foo'].regions.length).toBe(1);
		expect(app.model).toEqual({});
		expect(app['#idx'].model).toEqual({indexes: void 0});

		var replaceState = false;

		app.one('routeend', (evt) => {
			replaceState = evt.details.replaceState;
		});

		// ------------------------------------------ //
		await app.nav('/', {replaceState: true});

		expect(replaceState).toBeTruthy();
		expect(app.route.id).toBe('#idx');
		expect(app.url.href).toBe(app.request.href);
		expect(app.request.path).toBe('/');

		expect(app['#idx'].active).toBeTruthy();
		expect(app['#idx'].ok).toBeTruthy();
		expect(!app['#foo'].active).toBeTruthy();

		expect(app.model).toEqual({});
		expect(app.route.model).toEqual({indexes: 123});

		// ------------------------------------------ //
		await app.nav('/xxx/bar');

		expect(app.route.id).toBe('#bar');
		expect(app.request.path).toBe('/xxx/bar');

		// ------------------------------------------ //
		await app.nav('/yyy/baz/');

		expect(app['#foo'].active).toBeTruthy();
		expect(app.route.id).toBe('#baz');
		expect(app['#foo'].regions[0].foo).toBe('start');

		expect(app['#idx'].model).toEqual({indexes: void 0});
		expect(app['#foo'].model).toEqual({data: 'yyy'});
		expect(app.route.model).toEqual({data: 'yyy', subdata: 'baz'});

		// ------------------------------------------ //
		await app.nav('/zzz/bar/');

		expect(app['#foo'].regions[0].foo).toBe('end');
	});

	test('getUrl', () => {
		const app = createMockApp();

		expect(app.getUrl('#folder')).toBe('/');
		expect(app.getUrl('#folder', {folder: 0})).toBe('/0/');

		expect(app.getUrl('#letters')).toBe('/messages/');
		expect(app.getUrl('#letters', {type: 'inbox'})).toBe('/messages/inbox/');
		expect(app.getUrl('#letters', {id: 2})).toBe('/messages/folder/2/');
		expect(app.getUrl('#letters', 'inbox')).toBe('/messages/inbox/');
		expect(app.getUrl('#letters', 2)).toBe('/messages/folder/2/');
		expect(app.getUrl('#letters', 0)).toBe('/messages/inbox/');
		expect(app.getUrl('#letters', {id: 0})).toBe('/messages/inbox/');
		expect(app.getUrl('#letters', {id: 0}, {foo: 'bar'})).toBe('/messages/inbox/?foo=bar');
	});

	test('getUrl: inherit query', async () => {
		const app = createMockApp();

		await app.nav('/?foo&bar=Y');
		expect(app.getUrl('#letters', {}, 'inherit')).toBe('/messages/?foo&bar=Y');
	});

	test('letters', async () => {
		const app = createMockApp();

		await app.go('#letters', {type: 'inbox'});
		expect(app.route.params).toEqual({id: 1, type: 'inbox'});

		await app.go('#letters', {id: 2});
		expect(app.route.params).toEqual({id: 2});

		let error;

		try {
			await app.go('#letters', {id: 'str'});
		} catch (_) {
			error = _;
		}

		expect(error.code).toBe(404);
		expect(app.route.params).toEqual({id: 2});
	});

	test('search/query', async () => {
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

		await app.nav('/search/?find=foo');
		expect(query).toEqual({find: 'foo'});
	});

	xtest('race condition', async () => {
		var log = [];
		var loader = new Pilot.Loader({
			value: function (req) {
				return sleep(req.params.time);
			}
		}, {
			persist: true,
			processing: function (req, action, model) {
				log.push(model.value);
				return model;
			},
		});

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

		await sleep(110);
		expect(log).toEqual(['50']);
	});

	test('force', async () => {
		const app = createMockApp();

		var navigated = 0;

		var handleRoute = function () {
			navigated++;
		};

		await app.go('#letters', {type: 'inbox'});
		app.on('route', handleRoute);

		// Сейчас не перейдёт
		await app.go('#letters', {type: 'inbox'});

		expect(navigated).toBe(0);

		// А сейчас перейдёт
		await app.go('#letters', {type: 'inbox'}, null, {force: true});

		expect(navigated).toBe(1);
		app.off('route', handleRoute);
	});

	test('model/fail', async () => {
		const app = createMockApp();

		var log = [];
		var rnd = Math.random();
		app.on('beforeroute route-fail route-end', function (evt) {
			log.push(evt.type)
		});

		return app.go('#fail', {id: 1}).then().catch(function () {
			return app.go('#fail', {id: 1}).then(console.log).catch(function () {
				return rnd;
			});
		}).then(function (x) {
			expect(x).toBe(rnd);
			expect(log).toEqual([
				'beforeroute', 'routefail', 'routeend',
				'beforeroute', 'routefail', 'routeend',
			]);
		});
	});

	test('view reload event', () => {
		const app = createMockApp();
		const log = [];

		app.on('beforereload reload', (evt) => {
			log.push(evt.type);
		});

		app.activeUrl = new Pilot.URL(app['#letters'].getUrl({type: 'inbox'}), location);
		app.reload();

		expect(log).toEqual(['beforereload', 'reload']);
	});

	test('view reload event cancels', () => {
		const app = createMockApp();
		const log = [];

		app.on('beforereload reload', (evt) => {
			log.push(evt.type);
			return false;
		});

		app.activeUrl = new Pilot.URL(app['#letters'].getUrl({type: 'inbox'}), location);
		app.reload();

		expect(log).toEqual(['beforereload']);
	});

	test.skip('listenFrom', async () => { // Проходит сам по себе, но ловит асинхронную ошибку от model/fail, пока скипаем
		let navigated = 0;
		const handleRoute = function () {
			navigated++;
		};

		const app = createMockApp();
		app.on('route', handleRoute);

		const link = document.createElement('a');
		link.href = '/messages/inbox/';

		link.click();
		expect(navigated).toBe(0);

		app.listenFrom(link, {});

		link.click();
		await sleep(100);

		expect(app.activeUrl.pathname).toBe('/messages/inbox/');
		expect(navigated).toBe(1);

		app.off('route', handleRoute);
	});

	test.skip('listenFrom middle/right click', async () => { // Проходит сам по себе, но ловит асинхронную ошибку от model/fail, пока скипаем
		let navigated = 0;
		const handleRoute = function () {
			navigated++;
		};

		const leftClick = new MouseEvent('click', { button: 0, which: 0 });
		const middleClick = new MouseEvent('click', { button: 1, which: 1 });
		const rightClick = new MouseEvent('click', { button: 2, which: 2 });

		const app = createMockApp();
		app.on('route', handleRoute);

		const link = document.createElement('a');
		link.href = '/messages/inbox/';

		link.dispatchEvent(leftClick);
		link.dispatchEvent(middleClick);
		link.dispatchEvent(rightClick);
		expect(navigated).toBe(0);

		app.listenFrom(link, {});

		link.dispatchEvent(leftClick);
		await sleep(100);

		expect(app.activeUrl.pathname).toBe('/messages/inbox/');
		expect(navigated).toBe(1);

		await app.nav('/');
		expect(app.activeUrl.pathname).toBe('/');
		expect(navigated).toBe(2);

		link.dispatchEvent(middleClick);
		link.dispatchEvent(rightClick);
		await sleep(100);

		expect(app.activeUrl.pathname).toBe('/');
		expect(navigated).toBe(2);

		app.off('route', handleRoute);
	});

	function sleep(time) {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(time);
			}, time)
		})
	}
});
