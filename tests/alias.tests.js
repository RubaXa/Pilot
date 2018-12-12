/* global describe, beforeEach, test, expect */

const Pilot = require('../src/pilot');

describe('Pilot:alias',  () => {

	test('alias without parameter decoders', async () => {
		const app = Pilot.create({
			'#index': {
				url: '/:folder?',
				aliases: {
					'compose': '/compose/:folder?/:id?'
				}
			},
		});

		await app.nav('/');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/inbox');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({folder: 'inbox'});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/compose');

		// Переход с алиасом без параметров
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual('compose');

		await app.nav('/compose/inbox');

		// Переход с алиасом и параметром из основного роута
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({folder: 'inbox'});
		expect(app.request.alias).toEqual('compose');

		await app.nav('/compose/inbox/id');

		// Переход с алиасом и всеми параметрами
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({folder: 'inbox', id: 'id'});
		expect(app.request.alias).toEqual('compose');
	});

	test('alias with parameter decoders', async () => {
		const app = Pilot.create({
			'#index': {
				url: {
					pattern: '/:type?/:id?',
					params: {
						type: {
							decode: function (value, req) {
								return value;
							}
						},
						id: {
							validate: function (value) {
								return value >= 0;
							},
							decode: function (value, req) {
								return parseInt(value, 10);
							}
						}
					}
				},
				aliases: {
					'compose': {
						pattern: '/compose/:message?/:id?',
						params: {
							message: {
								decode: function (value, req) {
									return 'msg_' + parseInt(value, 10);
								}
							}
						}
					}
				}
			},
		});

		await app.nav('/');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/inbox');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({type: 'inbox'});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/inbox/3');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({type: 'inbox', id: 3});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/compose');

		// Переход с алиасом без параметров
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual('compose');

		await app.nav('/compose/3002');

		// Переход с алиасом и параметром
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({message: 'msg_3002'});
		expect(app.request.alias).toEqual('compose');

		await app.nav('/compose/3002/3');

		// Переход с алиасом и всеми параметрами
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({message: 'msg_3002', id: 3});
		expect(app.request.alias).toEqual('compose');
	});

	test('alias cleanup', async () => {
		const app = Pilot.create({
			'#index': {
				url: '/',
				aliases: {
					'compose': '/compose/'
				}
			},
		});

		await app.nav('/');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual(void 0);

		await app.nav('/compose');

		// Переход с алиасом без параметров
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual('compose');

		await app.nav('/');

		// Обычный переход, алиасов нет
		expect(app.route.is('#index')).toBeTruthy();
		expect(app.route.params).toEqual({});
		expect(app.request.alias).toEqual(void 0);
	});

});
