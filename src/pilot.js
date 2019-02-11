define([
	'Emitter',
	'./url',
	'./match',
	'./loader',
	'./request',
	'./route',
	'./status',
	'./queryString'
], function (
	/** Emitter */Emitter,
	/** URL */URL,
	/** Object */match,
	/** Pilot.Loader */Loader,
	/** Pilot.Request */Request,
	/** Pilot.Route */Route,
	/** Pilot.Status */Status,
	/** Pilot.queryString */queryString
) {
	'use strict';

	var aboutBlankUrl = new URL('about:blank')
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
					options.model = options.model ? map.model.extend(options.model) : map.model;
					options.access = options.access || map.access;

					routes.push(options);
					_prepareRoute(options);
				}
			});
		})({
			'#__root__': map,
			model: new Loader(map.model)
		});


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
		this.activeUrl = aboutBlankUrl;


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
		 * @param  {Object|'inherit'} [query]
		 */
		getUrl: function (id, params, query) {
			return this[id].getUrl(params, query);
		},


		/**
		 * Перейти по id
		 * @param  {string} id
		 * @param  {Object} [params]
		 * @param  {Object|'inherit'} [query]
		 * @param  {Object} [details]
		 * @return {Promise}
		 */
		go: function (id, params, query, details) {
			return this.nav(this[id].getUrl(params, query), details);
		},


		/**
		 * Навигация по маршруту
		 * @param   {string|URL|Pilot.Request}  href
		 * @param   {{initiator: string, replaceState: boolean, force: boolean}}  [details]
		 * @returns {Promise}
		 */
		nav: function (href, details) {
			var req,
				url = new URL(href.toString(), location),
				_this = this,
				routes = _this.routes,
				_promise = _this._promise,
				currentRoute;

			details = details || {};

			// URL должен отличаться от активного, либо если передали флаг force
			if (_this.activeUrl.href !== url.href || details.force) {
				// Создаем объект реквеста и дальше с ним работаем
				req = new Request(url, _this.request.href, _this);

				// Находим нужный нам маршрут
				currentRoute = routes.find(function (/** Pilot.Route */item) {
					return !item.__group__ && item.match(url, req);
				});

				_this.activeUrl = url;
				_this.activeRequest = req;
				_this.activeRoute = currentRoute;

				if (!_this.route) {
					_this.route = currentRoute;
				}

				_this.trigger('before-route', [req], details);

				if (!_this._promise) {
					_this._promise = _promise = new Promise(function (resolve, reject) {
						// Только в целях оптимизации стека
						_this._resolve = resolve;
						_this._reject = reject;
					});

					_promise['catch'](function (err) {
						if (currentRoute) {
							// todo: Найти ближайшую 404
							currentRoute.trigger(err.code + '', [req, err], details);
							currentRoute.trigger('error', [req, err], details);
						}

						_this.trigger('route-fail', [req, currentRoute, err], details);
						_this.trigger('route-end', [req, currentRoute], details);
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
							if (_this.activeUrl === url && model !== null) {
								_this.url = url;
								_this.referrer = _this.request.href;
								_this.route = currentRoute;
								_this.request = req;

								_this.__model__.bind(_this, model);

								// Обходим всем маршруты и тегерим события
								routes.forEach(function (/** Route */route) {
									route.handling(url, req.clone(), currentRoute, model);
								});

								if (!req.redirectHref) {
									_this.trigger('route', [req, currentRoute], details);

									if (!req.redirectHref) {
										_this.trigger('route-end', [req, currentRoute], details);

										if (!req.redirectHref) {
											_this._promise = null;
											_this._resolve();

											return; // exit
										}
									}
								}

								_this.useHistory && history.replaceState(null, null, req.redirectHref);
								_this.nav(req.redirectHref);
							}
						});
					})['catch'](function (err) {
						console.warn(err);

						// Обработка ошибки
						if (_this.activeUrl === url) {
							if (err instanceof Request) {
								_this.useHistory && history.replaceState(null, null, err.href);
								_this.nav(err.href);
								return;
							}

							_this._promise = null;
							_this.activeUrl = aboutBlankUrl;
							_this._reject(Status.from(err));

							return Promise.reject(err);
						}
					});
				}
			}

			return _promise || resolvedPromise;
		},

		/**
		 * Слушать события
		 * @param {HTMLElement} target
		 * @param {{logger:object, autoStart: boolean, filter: Function, replaceState: boolean}} options
		 */
		listenFrom: function (target, options) {
			var _this = this;
			var logger = options.logger;
			var filter = options.filter;
			var popStateNav = function () {
				_this.nav(location.href, {initiator: 'popstate'});
			};

			_this.useHistory = true;

			// Корректировка url, если location не совпадает
			_this.on('routeend', function (evt, req) {
				var href = req.toString();
				var replaceState = evt.details && evt.details.replaceState;

				if (location.toString() !== href) {
					logger && logger.add('router.pushState', {href: href});
					history[replaceState ? 'replaceState' : 'pushState'](null, null, href);
				}
			});

			// Слушаем `back`
			window.addEventListener('popstate', function () {
				if (logger) {
					logger.call('router.nav.popstate', {href: location.href}, popStateNav);
				} else {
					popStateNav();
				}
			}, false);

			// Перехватываем действия пользователя
			target.addEventListener('click', function pilotClickListener(evt) {
				var el = evt.target;
				var level = 0;
				var MAX_LEVEL = 10;
				var hostnameRegExp = new RegExp('^' + location.protocol + '//' + location.hostname);

				do {
					var url = el.href;

					if (
						url &&
						hostnameRegExp.test(url) &&
						!evt.defaultPrevented &&
						!(evt.metaKey || evt.ctrlKey || evt.button === 2) &&
						(!filter || filter(url))
					) {
						evt.preventDefault();

						var details = {
							initiator: 'click',
							replaceState: el.getAttribute('data-history-replace-state') === 'y',
						};

						var clickNav = function () {
							_this.nav(url, details);
							history[details.replaceState ? 'replaceState' : 'pushState'](null, null, url);
						};

						if (logger) {
							logger.call('router.nav.click', {href: url}, clickNav);
						} else {
							clickNav();
						}
						break;
					}
				} while ((el = el.parentNode) && (++level < MAX_LEVEL));

				el = null;
			});

			if (options.autoStart) {
				if (logger) {
					logger.call('router.nav.initial', {href: location.href}, function () {
						_this.nav(location.href, {
							initiator: 'initial',
							replaceState: options.replaceState,
						});
					});
				} else {
					_this.nav(location.href, {
						initiator: 'initial',
						replaceState: options.replaceState,
					});
				}
			}
		},

		/**
		 * Метод вызывает событие перезагрузки приложения.
		 */
		reload: function () {
			var _this = this;

			var evt = new Emitter.Event('beforereload');
			_this.trigger(evt);

			// Отменили перезагружку
			if (evt.result === false) {
				return Promise.resolve();
			}

			_this.trigger('reload');

			// TODO: События reload-fail и reload-end
			return _this.nav(_this.activeUrl.href, {force: true, replaceState: true})
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
	Pilot.URL = URL;
	Pilot.Loader = Loader;
	Pilot.Status = Status;
	Pilot.Request = Request;
	Pilot.Route = Route;
	Pilot.queryString = queryString;
	Pilot.version = '2.0.0';

	return Pilot;
});
