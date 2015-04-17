define([
	'Emitter',
	'./url',
	'./queryString'
], function (
	/** Emitter */Emitter,
	Url,
	/** queryString */queryString
) {
	'use strict';


	var _urlProcessing = function (rules, object, req) {
		return Object.keys(rules).every(function (name) {
			var rule = rules[name],
				value = object[name];

			object[name] = value = (rule.decode ? rule.decode(value, req) : value);

			return !rule.validate || rule.validate(value, req);
		});
	};



	/**
	 * @class Pilot.Route
	 * @constructs Pilot.Route
	 * @param {Object} options
	 */
	var Route = function (options) {
		var _this = this;

		Object.keys(options).forEach(function (key) {
			var value = options[key],
				act = key.match(/(^one?[:-])/);

			if (act) {
				if (act[1]) { // Биндинг событий
					this[act[1]](key.substr(3), function (evt, req) {
						// Событие не нужно, просто вызываем метод
						_this[key](req);
					});
				}
			}

			_this[key] = value;
		});

		_this.url.regexp = Url.toMatcher(this.url.pattern + (options.__group__ ? '/:any([a-z0-9\\/-]+)' : ''));
		_this.model = options.model.defaults();
		_this.__model__ = options.model;
	};


	Route.prototype = /** @lends Pilot.Route# */{
		constructor: Route,


		match: function (/** URL */url, /** Pilot.Request */req) {
			var params = Url.match(this.url.regexp, url.pathname),
				query = queryString.parse(url.query),
				_paramsRules = this.url.params,
				_queryRules = this.url.query;

			if (
				params &&
				(!_paramsRules || _urlProcessing(_paramsRules, params, req)) &&
				(!_queryRules || _urlProcessing(_queryRules, query, req))
			) {
				req.params = params;
				req.query = query;

				return true;
			}

			return false;
		},


		fetch: function (req) {
			return this.__model__.fetch(req);
		}
	};


	Emitter.apply(Route.prototype);


	// Export
	return Route;
});
