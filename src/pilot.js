define([
	'Emitter',
	'./url',
	'./match',
	'./loader',
	'./request',
	'./route',
	'./status'
], function (
	/** Emitter */Emitter,
	/** URL */URL,
	/** Object */match,
	/** Pilot.Loader */Loader,
	/** Pilot.Request */Request,
	/** Pilot.Route */Route,
	/** Pilot.Status */Status
) {
	'use strict';

	var resolvedPromise = Promise.resolve();


	function _normalizeRouteUrl(url, relative) {
		relative = relative || {};

		if (!url) {
			url = relative.pattern;
		}

		if (typeof url === 'string') {
			url = { pattern: url };
		}

		if (url.pattern.charAt(0) !== '/') {
			url.pattern = (relative.pattern + '/' + url.pattern.replace(/(^\.\/|^\.$)/, ''));
		}

		url.pattern = url.pattern.replace(/\/+/g, '/');
		url.params = url.params || relative.params || {};
		url.query = url.query || relative.query || {};
		url.toUrl = url.toUrl || relative.toUrl;

		return url;
	}



	/**
	 * @class Pilot
	 * @param {Object} map крата маршрутов
	 */
	var Pilot = function (map) {
		var routes = [];

		map.url = map.url || '/';
		map.access = map.access || function () {
			return resolvedPromise;
		};

		// Подготавливаем данные
		(function _prepareRoute(map) {
			map.__group__ = false;

			Object.keys(map).forEach(function (key) {
				var options = map[key];

				if (key.charAt(0) === '#') {
					// Это маршрут, следовательно `map` — группа
					map.__group__ = true;
					delete map[key];

					options.id = key;
					options.parentId = map.id;

					options.url = _normalizeRouteUrl(options.url, map.url);
					options.model = map.model.extend(options.model);
					options.access = options.access || map.access;

					routes.push(options);
					_prepareRoute(options);
				}
			});
		})({'#__root__': map, model: new Loader(map.model) });


		this.model = map.model.defaults();
		this.__model__ = map.model;


		/**
		 * Текущий реквест
		 * @type {Pilot.Request}
		 */
		this.request = new Request('about:blank', '', this);


		/**
		 * Активный URL
		 * @type {URL}
		 */
		this.activeUrl = new URL('about:blank');


		/**
		 * Массив маршрутов
		 * @type {Pilot.Route[]}
		 */
		this.routes = routes.map(function (route) {
			route = new Route(route, this);

			this[route.id] = route;

			return route;
		}, this);
	};


	Pilot.prototype = /** @lends Pilot# */{
		constructor: Pilot,

		/**
		 * Получить URL по id
		 * @param  {string} id
		 * @param  {Object} [params]
		 */
		getUrl: function (id, params) {
			return this[id].getUrl(params);
		},


		/**
		 * Перейти по id
		 * @param  {string} id
		 * @param  {Object} [params]
		 * @return {Promise}
		 */
		go: function (id, params) {
			return this.nav(this[id].getUrl(params));
		},


		/**
		 * Навигация по маршруту
		 * @param   {string|URL|Pilot.Request}  href
		 * @returns {Promise}
		 */
		nav: function (href) {
			var req,
				url = new URL(href.toString(), location),
				_this = this,
				routes = _this.routes,
				_promise = _this._promise,
				currentRoute;

			// URL должен отличаться от активного
			if (_this.activeUrl.href !== url.href) {
				// Создаем объект реквеста и дальше с ним работаем
				req = new Request(url, _this.request.href, _this);

				// Находим нужный нам маршрут
				currentRoute = routes.filter(function (/** Pilot.Route */item) {
					return !item.__group__ && item.match(url, req);
				})[0];


				_this.activeUrl = url;
				_this.activeRequest = req;
				_this.activeRoute = currentRoute;

				_this.trigger('before-route', [req]);


				if (!_this._promise) {
					_this._promise = _promise = new Promise(function (resolve, reject) {
						// Только в целях оптимизации стека
						_this._resolve = resolve;
						_this._reject = reject;
					});

					_promise['catch'](function (err) {
						if (currentRoute) {
							// todo: Найти ближайшую 404
							currentRoute.trigger(err.code + '', [err, req]);
							currentRoute.trigger('error', [err, req]);
						}

						_this.trigger('route-fail', [err, req]);
						_this.trigger('route-end', [req]);
					});
				}


				if (!currentRoute) {
					// Если маршрут не найден, кидаем ошибку
					_this._reject(new Status(404));
				}
				else {
					req.route = currentRoute;

					// Запрашиваем доступ к маршруту
					currentRoute.access(req).then(function () {
						// Доступ есть, теперь собираем данные для маршрута
						return currentRoute.fetch(req).then(function (/** Object */model) {
							if (_this.activeUrl === url) {
								_this.url = url;
								_this.referrer = _this.request.href;

								_this.model = _this.__model__.extract(model);
								_this.route = currentRoute;
								_this.request = req;

								// Обходим всем маршруты и тегерим события
								routes.forEach(function (/** Route */route) {
									route.handling(url, req.clone(), currentRoute, model);
								});

								_this.trigger('route', [req, currentRoute]);
								_this.trigger('route-end', [req, currentRoute]);

								_this._promise = null;
								_this._resolve();
							}
						});
					})['catch'](function (err) {
						console.warn(err);

						// todo: Редирект!
						// Обработка ошибки
						if (_this.activeUrl === url) {
							_this._promise = null;
							_this._reject(Status.from(err));

							return Promise.reject(err);
						}
					});
				}
			}

			return _promise || resolvedPromise;
		}
	};


	/**
	 * Создать роутер
	 * @param  {Object}  sitemap
	 * @return {Pilot}
	 */
	Pilot.create = function (sitemap) {
		return new Pilot(sitemap);
	};


	Emitter.apply(Pilot.prototype);


	// Export
	Pilot.version = '2.0.0';
	return Pilot;
});
