/* global describe, beforeEach, test, expect */

const Loader = require('../src/loader');

describe('Loader', () => {
	var reqX = { route: { id: '#X' } },
		reqY = { route: { id: '#Y' } };

	test('defaults', function () {
		var loader = new Loader({
			foo: function () {},
			bar: {
				defaults: 123
			}
		});

		expect(loader.defaults()).toEqual({foo: void 0, bar: 123});
	});


	test('fetch', async () => {
		var loader = new Loader({
			foo: function () {
				return 1
			},
			bar: {
				match: [],
				defaults: 2
			},
			baz: {
				match: ['#X'],
				defaults: -3,
				fetch: function () {
					return Promise.resolve(3);
				}
			},
			qux: function (req, waitFor) {
				return waitFor('baz').then(function (value) {
					return value * 2;
				});
			}
		});

		await loader.fetch(reqX).then(function (models) {
			expect(models).toEqual({foo: 1, bar: 2, baz: 3, qux: 6});

			return loader.fetch(reqY).then(function (models) {
				expect(models).toEqual({foo: 1, bar: 2, baz: -3, qux: -6});
			});
		})
	});


	test('extend', async () => {
		var loader = new Loader({
			foo: {
				value: 0,
				fetch: function () {
					return ++this.value;
				}
			},
			bar: {
				defaults: 123
			}
		});

		var extLoader = loader.extend({
			bar: function () {
				return 321;
			}
		});

		await loader.fetch(reqX).then(function (models) {
			expect(models).toEqual({foo: 1, bar: 123});

			return extLoader.fetch(reqY).then(function (models) {
				expect(models).toEqual({foo: 2, bar: 321});

				return loader.fetch(reqY).then(function (models) {
					expect(models).toEqual({foo: 3, bar: 123});
				});
			});
		});
	});


	test('fetch:error', async () => {
		var loader = new Loader({
			foo: function () {
				throw "error";
			}
		});

		expect(loader.fetch(reqX)).rejects;
	});
});
