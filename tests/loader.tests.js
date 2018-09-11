/* global describe, beforeEach, test, expect */

const Loader = require('../src/loader');

const reqX = { route: { id: '#X' } };
const reqY = { route: { id: '#Y' } };

function sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// Этот загрузчик любит спать и писать об этом в лог
async function createSleepyLoggingLoader(log, {persist} = {persist: false}) {
	const loader = new Loader({
		// Этот "переход по маршруту" будет просто ждать нужное кол-во милилсекунд
		data(request, waitFor, action) {
			return sleep(action.timeout)
				.then(() => `timeout ${action.timeout}`);
		}
	}, {
		persist,
		processing(request, action, models) {
			log.push(models.data);
		}
	});

	await loader.fetch(reqX);
	log.length = 0;

	return loader;
}

describe('Loader', () => {

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


	test('dispatch with high priority and no persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log);

		loader.dispatch({timeout: 20});
		loader.dispatch({timeout: 10});

		await sleep(30);

		expect(log).toEqual(['timeout 10', 'timeout 20']);
	});


	test('dispatch with low priority and no persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log);

		loader.dispatch({timeout: 20, priority: Loader.PRIORITY_LOW});
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_LOW});

		await sleep(100);

		expect(log).toEqual(['timeout 20', 'timeout 10']);
	});


	test('dispatch low after high priority and no persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log);

		loader.dispatch({timeout: 20, priority: Loader.PRIORITY_HIGH});
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_LOW});

		await sleep(100);

		expect(log).toEqual(['timeout 20', 'timeout 10']);
	});


	test('dispatch high after low priority and no persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log);

		loader.dispatch({timeout: 20, priority: Loader.PRIORITY_LOW});
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_HIGH});

		await sleep(100);

		expect(log).toEqual(['timeout 20', 'timeout 10']);
	});


	test('dispatch with high priority and persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log, {persist: true});

		loader.dispatch({timeout: 20});
		loader.dispatch({timeout: 10});

		await sleep(50);

		expect(log).toEqual(['timeout 20']);
	});


	test('dispatch with low priority and persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log, {persist: true});

		loader.dispatch({timeout: 20, priority: Loader.PRIORITY_LOW});
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_LOW});

		await sleep(100);

		expect(log).toEqual(['timeout 20', 'timeout 10']);
	});


	test('dispatch high, high, low, high and no persist', async () => {
		const log = [];
		const loader = await createSleepyLoggingLoader(log);

		loader.dispatch({timeout: 20, priority: Loader.PRIORITY_HIGH});
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_HIGH});
		loader.dispatch({timeout: 30, priority: Loader.PRIORITY_LOW});

		await sleep(40);
		loader.dispatch({timeout: 10, priority: Loader.PRIORITY_HIGH});

		await sleep(50);

		expect(log).toEqual(['timeout 10', 'timeout 20', 'timeout 30', 'timeout 10']);
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
