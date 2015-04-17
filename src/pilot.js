define([
	'Emitter',
	'./match',
	'./loader',
	'./request',
	'./route',
	'./status'
], function (
	/** Emitter */Emitter,
	/** Object */match,
	/** Pilot.Loader */Loader,
	/** Pilot.Request */Request,
	/** Pilot.Route */Route,
	/** Pilot.Status */Status
) {
	'use strict';

	var URL = window.URL;


	function _normalizeRouteUrl(url, relative) {
		if (typeof url === 'string') {
			url = { pattern: url };
		}

		if (url.pattern.charAt(0) !== '/') {
			url.pattern = (relative.pattern + '/' + url.pattern.replace(/(^\.\/|^\.$)/, '')).replace(/\/+/g, '/');
		}

		url.params = url.params || {};
		url.query = url.query || {};

		return url;
	}



	/**
	 * @class Pilot
	 */
	var Pilot = function (map) {
		var routes = [];

		map.model = new Loader(map.model);
		map.access = map.access || function () {
			return Promise.resolve();
		};


		// Подготавливаем данные
		(function _prepare(map) {
			map.__group__ = false;

			Object.keys(map).forEach(function (key) {
				var value = map[key];

				if (key.charAt(0) === '#') {
					// Это маршрут, а значит map — группа
					map.__group__ = true;
					delete map[key];

					value.id = key;
					value.url = _normalizeRouteUrl(value.url, map.url);
					value.model = map.model.extend(value.model);
					value.access = value.access || map.access;

					routes.push(value);
					_prepare(value);
				}
			});
		})(map);


		this.model = map.model.defaults();
		this.__model__ = map.model;

		this.request = new Request('about:blank', '', this);
		this.activeUrl = new URL('about:blank');


		this.routes = routes.map(function (route) {
			route = new Route(route);

			route.router = route;
			this[route.id] = route;

			return route;
		}, this);
	};


	Pilot.prototype = /** @lends Pilot# */{
		constructor: Pilot,

		nav: function (href) {
			var req,
				url = new URL(href),
				_this = this,
				routes = _this.routes,
				_promise = _this._promise,
				currentRoute;


			if (_this.activeUrl.href !== url.href) {
				req = new Request(url, _this.request.href, _this);
				currentRoute = routes.filter(function (/** Pilot.Route */item) {
					return !item.__group__ && item.match(url, req);
				})[0];


				_this.activeUrl = url;
				_this.activeRequest = req;


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
					_this._reject(new Status(404));
				}
				else {
					req.route = currentRoute;

					currentRoute.access(req).then(function () {
						return currentRoute.fetch(req).then(function (/** Object */model) {
							if (_this.activeUrl === url) {
								_this.url = url;
								_this.referrer = _this.request.href;

								_this.model = _this.__model__.extract(model);
								_this.route = currentRoute;
								_this.request = req;

								// Обходим всем маршруты и тегерим события
								routes.forEach(function (/** Pilot.Route */route) {
									var localReq = req.clone();


									// Либо группа, либо «мы» (защита от множественных маршрутов)
									if (route.__group__ && route.match(url, localReq) || route === currentRoute) {
										route.model = route.__model__.extract(model);
										route.params = localReq.params;
										route.request = localReq;

										route.trigger('model', [model, localReq]);

										if (!route.active) {
											route.active = true;

											route.trigger('before-route-start', localReq);
											route.trigger('route-start', localReq);
										}
										else {
											route.trigger('before-route-change', localReq);
											route.trigger('route-change', localReq);
										}

										route.trigger('before-route', localReq);
										route.trigger('route', localReq);
									}
									else if (route.active) {
										route.active = false;
										route.model = route.__model__.defaults();

										route.trigger('before-route-end', localReq);
										route.trigger('route-end', localReq);
									}
								});

								_this.trigger('route', [req, currentRoute]);
								_this.trigger('route-end', [req, currentRoute]);

								_this._promise = null;
								_this._resolve();
							}
						});
					})['catch'](function (err) {
						if (_this.activeUrl === url) {
							_this._promise = null;
							_this._reject(Status.from(err));

							return Promise.reject(err);
						}
					});
				}
			}

			return _promise || Promise.resolve();
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
