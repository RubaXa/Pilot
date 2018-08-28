define(['./match'], function (match, Emitter) {
	'use strict';

	var _cast = function (name, model) {
		if (typeof model === 'function') {
			model = { fetch: model };
		}

		model.name = name;
		model.match = match.cast(model.match);

		return model;
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
			return this._loadSources(req, {type: Loader.ACTION_NAVIGATE});
		},

		dispatch: function (action) {
			return this._loadSources(this._lastReq, action);
		},

		_loadSources: function (req, action) {
			var _this = this;
			// Нужно для отметок в performance
			var requestId = _this._lastReqId++;

			// Action по умолчанию
			action = action && typeof action === 'object' ? action : {type: 'NONE'};

			var measureName = 'PilotJS ' + action.type + ' ' + requestId;
			performance && performance.mark('start:' + measureName);

			if (req == null) {
				req = _this._lastReq;
			}

			_this._lastReq = req;

			var _index = _this._index;
			var _options = _this._options;
			var _persistKey = req.toString() + action.type;
			var _fetchPromises = _this._fetchPromises;

			_this._lastKey = _persistKey;

			var names = _this.names;
			var models = {};
			var promises = [];
			var waitFor = function (name) {
				var idx = models[name];
				var model = _index[name];

				if (idx === void 0) {
					idx = new Promise(function (resolve) {
						if (model.fetch && model.match(req.route.id, req)) {
							resolve(model.fetch(req, waitFor, action, _this._lastModels));
						} else {
							resolve(model.defaults);
						}
					})
						.then(function (data) {
							if (_options.processingModel) {
								data = _options.processingModel(name, data, req, models);
							}
							return data;
						})
						.catch(function (err) {
							if (_options.processingModelError) {
								var p = _options.processingModelError(name, err, req, models);
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

			if (_options.persist && _fetchPromises[_persistKey]) {
				return _fetchPromises[_persistKey];
			}

			// Загружаем все модели
			names.forEach(waitFor);

			var _promise = Promise
				.all(promises)
				.then(function (results) {
					if (_this._lastKey === _persistKey) {
						names.forEach(function (name) {
							models[name] = results[models[name]];
						});

						_options.processing && (models = _options.processing(req, action, models));

						if (_this._bindedRoute) {
							_this._bindedRoute.model = _this.extract(models);
						}

						_this._lastModels = models;
						_this._measurePerformance(measureName);

						return models;
					} else {
						return null;
					}
				})
				.catch(function (error) {
					_this._measurePerformance(measureName);
					throw error;
				});

			if (_options.persist) {
				_fetchPromises[_persistKey] = _promise;

				_fetchPromises[_persistKey].then(function () {
					delete _fetchPromises[_persistKey];
				}, function () {
					delete _fetchPromises[_persistKey];
				});
			}

			_this._lastPromise = _promise;

			return _promise;
		},


		_measurePerformance: function (measureName) {
			if (performance) {
				performance.mark('end:' + measureName);
				performance.measure(measureName, 'start:' + measureName, 'end:' + measureName);

				performance.clearMarks('start:' + measureName);
				performance.clearMarks('end:' + measureName);
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
		}
	};

	Loader.ACTION_NAVIGATE = 'NAVIGATE';

	// Export
	return Loader;
});
