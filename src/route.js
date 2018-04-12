define([
	'Emitter',
	'./match',
	'./url',
	'./querystring'
], function (
	/** Emitter */Emitter,
	/** Object */match,
	/** URL */Url,
	/** queryString */queryString
) {
	'use strict';

	var R_SPACE = /\s+/;

	/**
	 * Обработка параметров url согласно правилам
	 * @param   {Object}        rules   правила
	 * @param   {Object}        target  объект обработки
	 * @param   {Pilot.Request} req     оригинальный запрос
	 * @returns {boolean}
	 * @private
	 */
	var _urlProcessing = function (rules, target, req) {
		return Object.keys(rules).every(function (name) {
			var rule = rules[name],
				value = target[name];

			if (value === void 0) {
				if (rule['default'] != null) {
					target[name] = rule['default'];
				}

				return true;
			}

			target[name] = value = (rule.decode ? rule.decode(value, req) : value);

			return !rule.validate || rule.validate(value, req);
		});
	};

	var _cleanUrl = function (url) {
		return url.replace(/\/+$/, '/');
	};


	/**
	 * Преобразование образца маршрута в функцию генерации URL
	 * @param  {string}  pattern
	 * @return {Function}
	 * @private
	 */
	var _toUrlBuilder = function (pattern) {
		var code = 'var url = "',
			i = 0,
			chr,
			expr;

		// Чистим образец
		pattern = pattern.replace(/([?*]|(\[.*?))/g, '');

		function parseGroupStatement(prefix) {
			var str = 'url += "';

			while (chr = pattern[i++]) {
				if (chr === ':') { // Переменная
					expr = pattern.substr(i).match(/[a-z0-9_-]+/)[0];
					str += '" + (params ? params["' + expr + '"] : "") + "';
					i += expr.length;
				}
				else if (chr === ')' || chr === '|') { // Группа или её закрытие
					code += prefix + 'if (params["' + expr + '"]) {' + str + '";}\n';
					(chr === '|') && parseGroupStatement('else ');
					break;
				}
				else {
					str += chr;
				}
			}
		}

		// Main loop
		while (chr = pattern[i++]) {
			if (chr === ':') { // Переменная
				expr = pattern.substr(i).match(/[a-z0-9_-]+/)[0];
				code += '" + (params ? params["' + expr + '"] : "") + "';
				i += expr.length
			}
			else if (chr === '(') { // Открытие группы
				code += '";\n';
				parseGroupStatement('');
				code += 'url += "';
			} else {
				code += chr;
			}
		}

		/* jshint evil:true */
		return new Function(
			'cleanUrl, stringify',
			'return function urlBuilder(params, query) {\n' + code + '/";' +
			'  return cleanUrl(url) + (query ? "?" + stringify(query) : "");' +
			'}'
		)(
			_cleanUrl,
			queryString.stringify
		);
	};


	/**
	 * @class Route
	 * @memberof Pilot
	 * @extends Emitter
	 * @constructs Pilot.Route
	 * @param  {Object}  options
	 * @param  {Pilot}   router
	 */
	var Route = function (options, router) {
		/**
		 * Описание URL
		 * @type {Object}
		 * @private
		 */
		this.url = {};

		/**
		 * Параметры маршрута
		 * @type {Object}
		 * @private
		 */
		this.params = {};

		/**
		 * Регионы
		 * @type {Array}
		 * @public
		 */
		this.regions = [];

		/**
		 * Ссылка на роутер
		 * @type {Pilot}
		 */
		this.router = router;

		// Инит опций и свойств по ним
		this._initOptions(options);

		/**
		 * Зазгрузчик моделей
		 * @type {Pilot.Loader}
		 * @private
		 */
		this.__model__ = options.model;

		/**
		 * Модели
		 * @type {Object}
		 * @public
		 */
		this.model = options.model.defaults();

		this.url.regexp = Url.toMatcher(this.url.pattern + (options.__group__ ? '/:any([a-z0-9\\/-]*)' : ''));
		this._urlBuilder = _toUrlBuilder(this.url.pattern);

		// Родительский маршрут (группа)
		this.parentRoute = this.router[this.parentId];

		this._initMixins()
	};


	Route.prototype = /** @lends Route# */{
		constructor: Route,

		/**
		 * Внутряняя инициализация маршрута
		 * @private
		 */
		__init: function () {
			this.inited = true;

			this.trigger('before-init', this);
			this.init();
			this.trigger('init', this);
		},

		/**
		 * Пользовательская инициализация маршрута
		 * @protected
		 */
		init: function () {
		},

		/**
		 * @param {Object} options
		 * @protected
		 */
		_initOptions: function (options) {
			var _this = this;

			_this.options = options;

			Object.keys(options).forEach(function (key) {
				var value = options[key],
					act = key.match(/^(one?)[:-](\w+)/);

				if (key === '*') { // Регионы
					Object.keys(value).map(function (name) {
						var region = new Route.Region(name, value[name], _this);

						_this.regions.push(region);
						_this.regions[name] = region;

						_this.on('model', function () {
							region.model = _this.model;
						});
					});
				}
				else if (act) {
					if (act[1]) { // Биндинг событий
						_this[act[1]](act[2].replace(/-/g, ''), function (evt, req) {
							// Передаем только `req`
							_this[key](req);
						});
					}
				}

				_this[key] = value;
			});
		},


		/**
		 * Подмешиваем
		 * @protected
		 */
		_initMixins: function () {
			Array.isArray(this.mixins) && this.mixins.forEach(function (mix) {
				Object.keys(mix).forEach(function (name) {
					if (name != 'apply') {
						this[name] = this[name] || mix[name];
					}
				}, this);

				mix.apply && mix.apply.call(this, this);
			}, this);
		},


		/**
		 * Обработка маршрута
		 * @param  {URL}     url
		 * @param  {Request} req
		 * @param  {Route}   currentRoute
		 * @param  {Object}  model
		 */
		handling: function (url, req, currentRoute, model) {
			// Либо это «мы», либо группа (только так, никаких множественных маршрутов)
			if ((this === currentRoute) || (this.__group__ && this.match(url, req))) {
				this.model = this.__model__.extract(model);
				this.params = req.params;
				this.request = req;

				this.trigger('model', [this.model, req]);

				if (!this.active) {
					this.active = true;

					// Внутренняя инициализация
					!this.inited && this.__init();

					this.trigger('route-start', req);
				}
				else {
					this.trigger('route-change', req);
				}

				this.trigger('route', req);

				// Обработка регионов
				this.regions.forEach(function (/** Route.Region */region) {
					if (this.active && region.match(currentRoute.id)) {
						if (!region.active) {
							region.active = true;

							!region.inited && region.__init();

							region.trigger('route-start', req);
						}

						region.trigger('route', req);
					}
					else if (region.active) {
						region.active = false;
						region.trigger('route-end', req);
					}
				}, this);
			}
			else if (this.active) {
				this.active = false;
				this.model = this.__model__.defaults();

				// Это не копипаст!
				this.regions.forEach(function (/** Route.Region */region) {
					if (region.active) {
						region.active = false;
						region.trigger('route-end', req);
					}
				});

				this.trigger('route-end', req);
			}
		},


		/**
		 * Проверка маршрута
		 * @param   {URL}  url
		 * @param   {Pilot.Request}  req
		 * @returns {boolean}
		 */
		match: function (url, req) {
			var params = Url.match(this.url.regexp, url.pathname),
				query = url.query,
				_paramsRules = this.url.params,
				_queryRules = this.url.query;

			return (
				params &&
				(!_paramsRules || _urlProcessing(_paramsRules, req.params = params, req)) &&
				(!_queryRules || _urlProcessing(_queryRules, req.query = query, req))
			);
		},

		/**
		 * Получить данные
		 * @param   {Pilot.Request} req
		 * @returns {Promise}
		 */
		fetch: function (req) {
			return this.__model__.fetch(req);
		},

		/**
		 * Получить URL
		 * @param  {Object} [params]
		 * @param  {Object|'inherit'} [query]
		 * @return {string}
		 */
		getUrl: function (params, query) {
			if (query === 'inherit') {
				query = this.router.request.query;
			}

			return this.url.toUrl ? this.url.toUrl(params, query, this._urlBuilder) : this._urlBuilder(params, query);
		},

		/**
		 * @param  {string} id
		 * @return {boolean}
		 */
		is: function (id) {
			if (id.indexOf(' ') > -1) {
				var list = id.split(R_SPACE);
				var idx = list.length;

				while (idx--) {
					if (list[idx] === this.id) {
						return true;
					}
				}
			}

			return this.id === id;
		}
	};


	Emitter.apply(Route.prototype);


	/**
	 * Регион маршрута
	 * @class Route.Region
	 * @extends Route
	 * @memberof Pilot
	 * @constructs Pilot.Route.Region
	 */
	Route.Region = function (name, options, route) {
		this.name = name;
		this.router = route.router;
		this.parentRoute = route;

		this._initOptions(options);
		this._initMixins();

		this.match = match.cast(options.match);
	};


	// Наследуем `Route`
	Route.Region.prototype = Object.create(Route.prototype);
	Route.Region.prototype.constructor = Route.Region;
	Route.Region.prototype.getUrl = function (params) {
		return this.parentRoute.getUrl(params);
	};


	// Export
	return Route;
});
