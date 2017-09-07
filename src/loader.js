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

		this.names.forEach(function (name) {
			this._index[name] = _cast(name, models[name]);
		}, this);
	};


	Loader.prototype = /** @lends Pilot.Loader# */{
		consturctor: Loader,


		defaults: function () {
			var defaults = {};

			this.names.forEach(function (name) {
				defaults[name] = this._index[name].defaults;
			}, this);

			return defaults;
		},


		fetch: function (req) {
			if (req == null) {
				req = this._lastReq;
			}

			this._lastReq = req;

			var _index = this._index;
			var _options = this._options;
			var _persistKey = req.toString();
			var _fetchPromises = this._fetchPromises;

			var names = this.names;
			var models = {};
			var promises = [];
			var waitFor = function (name) {
				var idx = models[name];
				var model = _index[name];

				if (idx === void 0) {
					idx = new Promise(function (resolve) {
						if (model.fetch && model.match(req.route.id, req)) {
							resolve(model.fetch(req, waitFor));
						} else {
							resolve(model.defaults);
						}
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

			var _promise = Promise.all(promises).then(function (results) {
				delete _fetchPromises[_persistKey];

				names.forEach(function (name) {
					models[name] = results[models[name]];
				});

				_options.processing && (models = _options.processing(req, models));

				return models;
			});

			if (_options.persist) {
				_fetchPromises[_persistKey] = _promise;
			}

			return _promise;
		},


		extend: function (models) {
			models = models || {};

			this.names.forEach(function (name) {
				models[name] = models[name] || this.models[name];
			}, this);

			return new Loader(models);
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
		}
	};


	// Export
	return Loader;
});
