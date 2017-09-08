define(['../src/loader'], function (Loader) {
	'use strict';

	QUnit.module('Loader');

	var reqX = { route: { id: '#X' } },
		reqY = { route: { id: '#Y' } };

	QUnit.test('defaults', function (assert) {
		var loader = new Loader({
			foo: function () {},
			bar: {
				defaults: 123
			}
		});

		assert.deepEqual(loader.defaults(), {foo: void 0, bar: 123});
	});


	QUnit.test('fetch', function (assert) {
		var done = assert.async();
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


		loader.fetch(reqX).then(function (models) {
			assert.deepEqual(models, {foo: 1, bar: 2, baz: 3, qux: 6}, '#X');

			return loader.fetch(reqY).then(function (models) {
				assert.deepEqual(models, {foo: 1, bar: 2, baz: -3, qux: -6}, '#Y');
				done();
			});
		})['catch'](function () {
			assert.ok(false, 'fail');
			done();
		});
	});


	QUnit.test('extend', function (assert) {
		var done = assert.async();
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

		return loader.fetch(reqX).then(function (models) {
			assert.deepEqual(models, {foo: 1, bar: 123});

			return extLoader.fetch(reqY).then(function (models) {
				assert.deepEqual(models, {foo: 2, bar: 321});

				return loader.fetch(reqY).then(function (models) {
					assert.deepEqual(models, {foo: 3, bar: 123});
					done();
				});
			});
		})['catch'](function () {
			assert.ok(false);
			done();
		});
	});


	QUnit.test('fetch:error', function (assert) {
		var done = assert.async();
		var loader = new Loader({
			foo: function () {
				throw "error";
			}
		});

		return loader.fetch(reqX).then(function () {
			assert.ok(false);
			done();
		})['catch'](function () {
			assert.ok(true);
			done();
		});
	});
});
