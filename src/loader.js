define(['./match'], function (match) {
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
	 * @class Pilot.Loader
	 * @constructs Pilot.Loader
	 * @param {Object} models
	 * @constructor
	 */
	var Loader = function (models) {
		this.models = models = (models || {});
		this.names = Object.keys(models);

		this._index = {};
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
			var _index = this._index,

				names = this.names,
				models = {},
				promises = [],

				waitFor = function (name) {
					var idx = models[name],
						model = _index[name];

					if (idx === void 0) {
						idx = new Promise(function (resolve) {
							if (model.fetch && model.match(req.route.id, req)) {
								resolve(model.fetch(req, waitFor));
							}
							else {
								resolve(model.defaults);
							}
						});

						idx = promises.push(idx) - 1;
						models[name] = idx;
					}

					return promises[idx];
				};

			// Загружаем все модели
			names.forEach(waitFor);

			return Promise.all(promises).then(function (results) {
				names.forEach(function (name) {
					models[name] = results[models[name]];
				});

				return models;
			});
		},


		extend: function (models) {
			models = models || {};

			this.names.forEach(function (name) {
				models[name] = models[name] || this.models[name];
			}, this);

			return new Loader(models);
		},


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
