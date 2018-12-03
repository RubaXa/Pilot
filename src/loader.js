define(['./match', './action-queue'], function (match, ActionQueue) {
	'use strict';

	var _cast = function (name, model) {
		if (typeof model === 'function') {
			model = { fetch: model };
		}

		model.name = name;
		model.match = match.cast(model.match);

		return model;
	};

	// На коленке полифиллим setImmediate
	var setImmediate = window.setImmediate || function setImmediateDummyPolyfillFromPilotJS(callback) {
		setTimeout(callback, 0);
	};

	/**
	 * @typedef  {object} LoaderOptions
	 * @property {boolean}  persist
	 * @property {Function} processing
	 */


	/**
	 * @class Pilot.Loader
	 * @extends Emitter
	 * @constructs Pilot.Loader
	 * @param {Object} models
	 * @param {LoaderOptions} [options]
	 * @constructor
	 */
	var Loader = function (models, options) {
		if (models instanceof Loader) {
			return models;
		}

		this.models = models = (models || {});
		this.names = Object.keys(models);

		this._index = {};
		this._options = options || {};

		this._lastReq = null;
		this._fetchPromises = {};

		// Инкрементивный ID запросов нужен для performance
		this._lastReqId = 0;
		// Дебаг-режим, выводит в performance все экшны
		this._debug = false;
		// Очередь экшнов
		this._actionQueue = new ActionQueue();

		this.names.forEach(function (name) {
			this._index[name] = _cast(name, models[name]);
		}, this);
	};


	Loader.prototype = /** @lends Pilot.Loader# */{
		constructor: Loader,


		defaults: function () {
			var defaults = {};

			this.names.forEach(function (name) {
				defaults[name] = this._index[name].defaults;
			}, this);

			return defaults;
		},

		fetch: function (req) {
			return this._executeAction(req, {
				type: Loader.ACTION_NAVIGATE,
				priority: Loader.PRIORITY_LOW
			});
		},

		dispatch: function (action) {
			return this._executeAction(null, action);
		},

		makeWaitFor: function (models, index, req, action, options, promises) {
			var _this = this;

			var waitFor = function (name) {
				var idx = models[name];
				var model = index[name];

				if (idx === void 0) {
					idx = new Promise(function (resolve) {
						if (model.fetch && model.match(req.route.id, req)) {
							resolve(model.fetch(req, waitFor, action, _this._lastModels));
						} else {
							resolve(model.defaults);
						}
					})
						.then(function (data) {
							if (options.processingModel) {
								data = options.processingModel(name, data, req, models, action);
							}
							return data;
						})
						.catch(function (err) {
							if (options.processingModelError) {
								var p = options.processingModelError(name, err, req, models, action);
								if (p !== null) {
									return p;
								}
							}
							return Promise.reject(err);
						});

					idx = promises.push(idx) - 1;
					models[name] = idx;
				}

				return promises[idx];
			};

			return waitFor;
		},

		_loadSources: function (req, action) {
			var _this = this;

			// Нужно для отметок в performance
			var requestId = _this._lastReqId++;

			// Используем предыдущий запрос, если не передали
			if (req == null) {
				req = _this._lastReq;
			}

			// Запомним этот запрос как последний, чьё выполнение мы начали
			_this._lastReq = req;

			var _index = _this._index;
			var _options = _this._options;
			var _persistKey = req.toString() + action.type + action.uid;
			var _fetchPromises = _this._fetchPromises;

			if (_options.persist && _fetchPromises[_persistKey]) {
				return _fetchPromises[_persistKey];
			}

			var priorityName = action.priority === Loader.PRIORITY_LOW ? 'LOW' : 'HIGH';
			var measureName = 'PilotJS [' + priorityName + '] ' + action.type + ' ' + requestId;

			if (_this._debug && window.performance) {
				window.performance.mark('start:' + measureName);
			}

			// Имена источников
			var names = _this.names;
			// Будущие данные источников
			var models = {};
			// Промисы источников
			var promises = [];

			// Делаем функцию waitFor для текущего запроса
			var waitFor = this.makeWaitFor(models, _index, req, action, _options, promises);

			// Загружаем все модели
			names.forEach(waitFor);

			var _promise = Promise
				.all(promises)
				.then(function (results) {
					_this._measurePerformance(measureName);

					// Формируем новое состояние
					names.forEach(function (name) {
						models[name] = results[models[name]];
					});

					// Вызываем коллбек processing
					_options.processing && (models = _options.processing(req, action, models));

					if (_this._bindedRoute) {
						_this._bindedRoute.model = _this.extract(models);
					}

					// Запоминаем загруженные модели
					_this._lastModels = models;

					return models;
				})
				.catch(function (error) {
					_this._measurePerformance(measureName);
					throw error;
				});

			if (_options.persist) {
				_fetchPromises[_persistKey] = _promise;

				// После выполнения текущего запроса нужно удалить промис из _fetchPromises
				_fetchPromises[_persistKey].then(function () {
					delete _fetchPromises[_persistKey];
				}, function () {
					delete _fetchPromises[_persistKey];
				});
			}

			// Запоминаем промис запроса
			_this._lastPromise = _promise;

			return _promise;
		},

		_executeAction: function (req, action) {
			var _this = this;
			var _req = req;

			// Action по умолчанию
			action = action && typeof action === 'object' ? action : {
				type: Loader.ACTION_NONE,
				priority: Loader.PRIORITY_HIGH
			};

			// Используем предыдущий запрос, если не передали
			if (_req == null) {
				_req = _this._lastReq;
			}

			// Если у нас стоит persist: true, то сначала проверим, что такой запрос уже есть
			// См. тест 'dispatch with low priority and persist fires only once'
			var _persistKey = _req.toString() + action.type + action.uid;
			var _fetchPromises = _this._fetchPromises;

			if (_this._options.persist && _fetchPromises[_persistKey]) {
				return _fetchPromises[_persistKey];
			}

			// Добавляем экшн в очередь
			var actionId = _this._actionQueue.push(_req, action);
			// Пробуем выполнить следующий экшн из очереди
			this._tryProcessQueue();
			// Возвращаем промис, который выполнится, когда выполнится этот экшн
			return _this._actionQueue.awaitEnd(actionId);
		},

		_tryProcessQueue: function() {
			while (this._actionQueue.canPoll()) {
				var queueItem = this._actionQueue.poll();

				// Отправляем экшн выполняться
				var actionPromise = this._loadSources(queueItem.request, queueItem.action);

				actionPromise
					// Ошибку на этом этапе уже обработали
					.catch(function () {
					})
					.then(function (queueItem, result) {
						// Сообщаем, что экшн прекратили выполнять
						this._actionQueue.notifyEnd(queueItem.id, result);
						// Пробуем выполнить следующий экшн
						this._tryProcessQueue();
					}.bind(this, queueItem));
			}
		},


		_measurePerformance: function (measureName) {
			if (this._debug && window.performance) {
				window.performance.mark('end:' + measureName);
				window.performance.measure(measureName, 'start:' + measureName, 'end:' + measureName);

				window.performance.clearMarks('start:' + measureName);
				window.performance.clearMarks('end:' + measureName);
			}
		},


		extend: function (models) {
			models = models || {};

			this.names.forEach(function (name) {
				models[name] = models[name] || this.models[name];
			}, this);

			return new Loader(models);
		},

		getLastReq: function () {
			return this._lastReq;
		},

		/**
		 * Достаем только принадлежание лоудеру свойства
		 * @param   {Object}  model
		 * @returns {Object}
		 */
		extract: function (model) {
			var data = {};

			this.names.forEach(function (name) {
				data[name] = model[name];
			});

			return data;
		},

		bind: function (route, model) {
			route.model = this.extract(model);
			this._bindedRoute = route;
		},

		/**
		 * Включаем / выключаем дебаг-режим
		 * @param {boolean} debug
		 */
		setDebug: function (debug) {
			this._debug = !!debug;
		}
	};

	Loader.ACTION_NAVIGATE = 'NAVIGATE';
	Loader.ACTION_NONE = 'NONE';
	Loader.PRIORITY_LOW = ActionQueue.PRIORITY_LOW;
	Loader.PRIORITY_HIGH = ActionQueue.PRIORITY_HIGH;

	// Export
	return Loader;
});
