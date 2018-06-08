/**!
 * Multifunction JavaScript router
 * @author	RubaXa	<trash@rubaxa.org>
 *
 * @example
 *	var Moses = new Pilot;
 *
 *	Moses.createGroup('/', { id: 'home' })
 *		.route('*', app.LeftCol)
 *		.route('.', app.Index)
 *		.createGroup('blog/', { id: 'blog' } )
 *			.route('.', app.BlogPosts)
 *			.route('post/:id', app.BlogPost, { id: 'blog-post' })
 *			.closeGroup()
 *		.route('about', { id: 'about' })
 *	;
 *
 *	Moses.nav('/blog/');
 *	// OR
 *	Moses.go('blog-post', { id: 2 });
 */

/*global window, define, unescape, ajs, Emitter*/
(function (window){
	"use strict";

	/** @namespace window.performance.now  -- https://developer.mozilla.org/en-US/docs/Web/API/window.performance.now */
	var performance = window.performance || {};
	performance.now = (function() {
		return (
			   performance.now
			|| performance.mozNow
			|| performance.msNow
			|| performance.oNow
			|| performance.webkitNow
		);
	})();


	var
		  gid		= 0
		, noop		= function (){}
		, undef		= void 0

		, $			= window.jQuery || window.Zepto || window.ender || window.$ || function (el) { return el; }
		, Deferred	= window.Deferred || $.Deferred
		, Event		= window.Emitter && Emitter.Event || $.Event

		, history	= window.history
		, document	= window.document
		, location	= window.location

		, _rspace	= /\s+/
		, _rhttp	= /^(?:https?|file)/i
		, _rrclean	= /(?:^(?:https?|file):\/\/[^/]*|[?#].*)/g

		, _slice	= [].slice
		, _toStr	= {}.toString
		, _bind		= function (ctx, fn){
			var args = _slice.call(arguments, 2);
			return	fn.bind ? fn.bind.apply(fn, [ctx].concat(args)) : function (){
				return fn.apply(ctx, args.concat(_slice.call(arguments)));
			};
		}

		, _isArray	= Array.isArray || $.isArray
		, _when = Deferred.all || Deferred.when || function (args){
			return	$.when.apply($, args);
		}

		, _getRouteAccess = function (route, req){
			var permission = route.accessPermission, access = Router.access[permission];
			return	permission === void 0 || (access ? access(req) : false);
		}

		, _now = performance.now ? function (){ return performance.now(); } : function (){ return (new Date).getTime(); }
		, _timeStart = function (ctx, label){ ctx._profilerTimers.push([label, _now(), 0]); }
		, _timeEnd = function (ctx, label){ ctx._profilerTimers.push([label, _now(), 1]); }
	;

	function _tryEmit(production, router, unit, name, req){
		if( production ){
			try {
				unit.trigger(name, req);
			} catch( err ){
				if (err instanceof Object) {
					err.name = name.replace('-', '');
				}

				router.trigger('error', err, req);
				unit.setRouteError(err);
			}
		}
		else {
			unit.trigger(name, req);
		}
	}


	/**
	 * Base class
	 *
	 * @param	{Object}	methods
	 * @return	{Function}
	 */
	var klass = function (methods){
		var New = function (){
			if( New.fn.singleton ){
				if( New.__inst__ ){
					return	New.__inst__;
				}
				New.__inst__ = this;
			}

			this.cid = this.uniqId = ++gid;
			this.__lego.apply(this, arguments);
		};

		New.fn = New.prototype = methods || {};
		New.fn.__self = New.fn.constructor = New;

		New.extend = function (methods){
			var Ext = klass();

			noop.prototype = this.fn;
			Ext.prototype = new noop;

			_extend(Ext, this);

			_each(methods, function (fn, name) {
				if (typeof fn === 'function') {
					// Export parent method
					fn.parent = Ext.prototype[name];
				}
				Ext.prototype[name] = fn;
			});
			Ext.fn = Ext.prototype;

			Ext.fn.__fn = Ext.fn.__super__ = this.fn;
			Ext.fn.__self = Ext.fn.__self__ = New.fn.constructor = Ext;

			return	Ext;
		};

		return	New;
	};


	/**
	 * @class    MyEmitter
	 * @extends  Emitter
	 */
	var MyEmitter = klass(window.Emitter && Emitter.fn || {
		__withoutEvents__: false,

		__lego: function (){
			if (this.__withoutEvents__) {
				this.trigger = noop;
			}
			else {
				var $emitter = $(this);

				_each({ on: 'bind', off: 'unbind', fire: 'triggerHandler' }, function (exportName, originalMethod){
					this[originalMethod] = function (){
						$emitter[exportName].apply($emitter, arguments);
						return	this;
					};
				}, this);
			}
		},

		on: function () {
			return this;
		},

		off: function () {
			return this;
		},

		trigger: function (name, args){
			var
				  method = ('on-'+name).replace(/-(.)/g, function (a, b){ return b.toUpperCase(); })
				, evt = Event(name.replace(/-/g, '').toLowerCase())
				, res
			;

			evt.target = this;

			if( (this[method] === undef) || (this[method].apply(this, [evt].concat(args)) !== false) ){
				if( !evt.isImmediatePropagationStopped() ){
					res	= this.fire(evt, args);
				}
			}

			return res;
		}
	});
	MyEmitter.prototype.emit = MyEmitter.prototype.trigger;



	/**
	 * @class    Pilot
	 * @exports  Emitter
	 */
	var Router = MyEmitter.extend(/** @lends Pilot.prototype */{

		/**
		 * @constructor
		 * @param	{Object}	options
		 */
		__lego: function __(options){
			// call the parent method
			MyEmitter.prototype.__lego.call(this);

			this.options	= options = _extend({
				  el: null
				, selector: 'a[href],[data-nav]'
				, basePath: '/'
				, production: window.Pilot && window.Pilot.production
				, hashBang: '#!'
				, useHistory: false
			}, options);

			this.items		= [];
			this.itemsIdx	= {};

			this.request	=
			this.referrer	= Router.parseURL( Router.getLocation() );

			this.history	= [];
			this.historyIdx	= 0;

			if( options.useHistory ){
				var events = (Router.pushState && history.pushState) ? 'popstate' : 'hashchange';
				$(window).bind(events, _bind(this, function (){
					this.nav( Router.getLocation() );
				}));
			}



			if( options.profile ){
				_profilerWrap(this, 'emit', true);

				_each({
					  'prepare': '_getUnits'
					, 'load data': '_loadUnits'
					, 'do routes': '_doRouteUnits'
				}, function (methodName, label){
					_profilerWrap(this, methodName, 0, 0, label);
				}, this);

				var _navFn = this._nav;
				this._nav = function (){
					var _this = this, _timers = _this._profilerTimers = [], print = function (){
						_timeEnd(_this, 'Pilot');
						_this.trigger('profile', [_timers]);
						_profilerPrint(_this.request.path, _timers);
					};

					_timeStart(_this, 'Pilot');

					return	_navFn.apply(_this, arguments).done(print).fail(print);
				};
			}

			// TODO: use "$(el).on('click', options.selector, ...)" instead of deprecated ".delegate(...)"
			options.el && $() && $(options.el).delegate(options.selector, 'click tap', _bind(this, function (evt){
				var el = evt.currentTarget,
					url = el.getAttribute('data-nav') || el.getAttribute('href')
				;

				if (el.target !== '_blank' && el.target !== '_self') {
					evt.preventDefault();

					if( url === 'back' || url === 'forward' ){
						this[url]();
					} else {
						this.nav( Router.getLocation( url ) );
					}
				}
			}));


			this.init();
		},


		/** @protected */
		init: function (){
		},


		route: function (id, path, route, options, isGroup){
			var router = this.addRoute(id, path, route, options, isGroup);
			return	isGroup ? router : this;
		},


		/**
		 * Add route
		 *
		 * @param	{String}		id
		 * @param	{String}		path
		 * @param	{Pilot.Route}	unit
		 * @param	{Object}		[options]
		 * @param	{Boolean}		[isGroup]
		 * @return	{Number}
		 */
		addRoute: function (id, path, unit, options, isGroup){
			if( !/string|regexp/i.test(_toStr.call(path)) ){
				options = unit;
				//noinspection JSValidateTypes
				unit = path;
				path = id;
				id = undef;
			}

			//noinspection JSUnresolvedVariable
			if( unit && !unit.fn ){
				var fn = unit;
				unit = Route.extend(typeof fn != 'function' ? fn : {
					init: function (){
						this.on('routestart routechange' + (options === true ? ' routeend' : ''), fn);
					}
				});
			}


			// build path
			if( !path.source ){
				path = (this.options.basePath + (path == '.' ? '' : path)).replace(/\/\//, '/');
			}

			var
				  keys = [] // path keys
				, router = this
				, paramsRules = options && options.paramsRules || unit && unit.fn.paramsRules || {}
				, idx
			;

			if( isGroup ){
				router	= new Router({
					basePath: path,
					paramsRules: paramsRules
				});
				router.items = this.items;
				router.itemsIdx = this.itemsIdx;
				router.parentRouter = this;
				path += '*';
			}

			if( unit ){
				idx = this.items.push({
					  id:		id
					, path:		path
					, keys:		keys
					, regexp:	_pathRegexp(path, keys, _extend({}, router.options.paramsRules, paramsRules))
					, unit:		unit || Router.View
					, options:	options
				});

				if( id ){
					this.itemsIdx[id] = idx-1;
				}
			}


			return	isGroup ? router : idx;
		},


		/**
		 * Remove route by id
		 *
		 * @param	{Number}	id
		 */
		removeRoute: function (id){
			id = this.itemsIdx[id] || id;
			this.items.splice(id, 1);
		},


		createGroup: function (id, path, unit, options){
			return	this.route(id, path, unit, options, true);
		},


		closeGroup: function (){
			return	this.parentRouter || this;
		},


		_getUnits: function (req/**Pilot.Request*/, items){
			var units = [];

			_each(items, function (item){
				var unit = item.unit, params = [];

				if( _matchRoute(req, item.regexp, item.keys, params) ){
					if( unit.__self === undef ){
						item.unit = unit = new unit(_extend({
							  id:		item.id
							, router:	this
							, inited:	false
						}, item.options));
					}

					unit.requestParams = params;
					units.push(unit);
				}
			}, this);

			return	units;
		},


		_loadUnits: function (req/**Pilot.Request*/, originUnits){
			var
				  queue = []
				, accessQueue = []
				, task
				, dfd
				, access
				, accessDenied
				, units
				, promise
				, production = this.options.production
				, addSubRoute = function (route, name){
					if( !route.__self ){
						if( !route.fn || !route.fn.__lego ){
							route = View.extend(route);
						}

						route = new route({
							router: this.router,
							inited: false,
							parentRoute: this,
							subrouteName: name
						});

						route.el = route.el || '[data-subview-id="'+name+'"]';
						this.subroutes[name] = route;
					}

					route.requestParams = this.requestParams;
					units.push(route);
				}
			;

			// Clone
			units = originUnits.concat();

			while( task = units.shift() ){
				if( task && task.isActive(originUnits) ){
					req.params = task.requestParams;

					dfd = null;
					task.setRouteError(null);

					access = _getRouteAccess(task, req);
					accessDenied = task.accessDeniedRedirectTo && {
						  redirectTo: task.accessDeniedRedirectTo
						, redirectParams: task.requestParams
					};

					if( !access ){
						task.trigger('accessDenied', req);
						return Deferred().reject(accessDenied);
					}
					else if( access.then ){
						access.denied = accessDenied;
						accessQueue.push(access);
					}

					_each(task.subroutes, addSubRoute, task);

					if( task.templateUrl ){
						queue.push(Router.loadTemplate(task.templateUrl, task).then(_bind(task, task.setTemplate)));
					}

					if( task.loadData ){
						if( !access || !access.then ){
							if( production ){
								try {
									dfd = task.loadData(req, this._navByHistory);
								}
								catch( err ){
									dfd = Deferred().reject(err);

									if (err instanceof Object) {
										err.name = 'loadData';
									}

									this.trigger('error', err, req);
								}
							}
							else {
								dfd = task.loadData(req, this._navByHistory);
							}
						}
						else {
							dfd = _bind(task, 'loadData', req, this._navByHistory);
						}
					}

					if( dfd ){
						if( typeof dfd.then === 'function' ){
							dfd.then(
								  _bind(task, task.setLoadedData)
								, _bind(task, task.setRouteError)
							);
							queue.push(dfd);
						}
					}

					if( !dfd || typeof dfd.then !== 'function' ){
						task.setLoadedData(dfd);
					}

					delete req.params;
				}
			}

			if( accessQueue.length ){
				promise = Deferred();

				_when(accessQueue)
					.then(function (){
						_when(queue).then(promise.resolve, promise.reject);
					}, function (){
						promise.reject(access.denied);
					})
				;
			}
			else {
				promise	= _when(queue);
			}

			return	promise;
		},


		_doRouteUnits: function (request/**Pilot.Request*/, items){
			var
				options = this.options,
				profile = options.profile,
				production = options.production
			;

			_each(items, function (item){
				var
					  unit = item.unit
					, routeChange = true
					, params = []
					, req = request.clone()
				;

				if( profile && unit.__self ){
					_timeStart(this, '#'+unit.getRouteName());
				}

				req.params = params;

				if( _matchRoute(req, item.regexp, item.keys, params) && unit.isActive(this.activeUnits) ){
					unit.request = req;

					if( unit.inited !== true ){
						unit.__init();
					}

					if( unit.active !== true ){
						routeChange = false;
						unit.active = true;
						_tryEmit(production, this, unit, 'routeStart', req);
					}
					else if( true ){
						// @todo: Проверить изменение параметров, если их нет, не вызывать событие
					}

					_tryEmit(production, this, unit, 'route', req);

					if( routeChange ){
						_tryEmit(production, this, unit, 'routeChange', req);
					}
				}
				else if( (unit.active === true) && !~$.inArray(unit, this.activeUnits) ){
					unit.active = false;
					unit.request = req;
					_tryEmit(production, this, unit, 'routeEnd', req);
				}

				if( profile && unit.__self ){
					_timeEnd(this, '#'+unit.getRouteName());
				}
			}, this);
		},


		_doRouteDone: function (req/**Pilot.Request*/){
			if( this.activeRequest === req ){
				if( this.request.url != req.url ){
					this.referrer = this.request;

					if( this.options.useHistory  ){
						Router.setLocation(req);
					}
				}

				this.request = req;

				if( !this._navByHistory ){
					this.history = this.history.slice(0, this.historyIdx+1);
					this.historyIdx = this.history.push(req.url) - 1;
				}

				this.trigger('routeStart', [req]);

				// debatable, but there will be so.
				if( this.items.length ){
					this._doRouteUnits(req, this.items);
				}

				var delta = new Date - this.__ts;
				this.trigger('route', [req, delta]);
				this.trigger('routeEnd', [req, delta]);

				if( !this.options.profile ){
					this.log('Pilot.nav: '+ delta +'ms ('+ req.path + req.search +')');
				}
			}
		},


		_doRouteFail: function (req/**Pilot.Request*/, opts/**Object*/){
			opts = opts || {};

			if( this.activeRequest === req ){
				var redirectTo = opts.redirectTo;

				this.activeRequest = null;

				if( redirectTo ){
					if( redirectTo === '..' ){
						redirectTo = req.path.split('/');

						if( redirectTo.pop() === "" ){
							redirectTo.pop();
							redirectTo.push("");
						}

						redirectTo = redirectTo.join('/');
					}
					else if( typeof redirectTo === 'function' ){
						redirectTo = redirectTo.call(this, req);
					}
					else if( this.get(redirectTo) ){
						redirectTo = this.getUrl(redirectTo, opts.redirectParams);
					}

					this.request = req; // for correct `referrer`
					this.nav(redirectTo);
				}
				else {
					this.trigger('routeFail', req, opts);
				}
			}
		},


		log: function (str){
			if( !this.options.production && window.console ){
				console.log(str);
			}
		},


		error: function (str){
			if( !this.options.production ){
				if( window.console && console.error ){
					console.error(str);
				} else {
					this.log(str);
				}
			}
		},


		getFailRoutes: function (){
			return	$(this.activeUnits).filter(function (i, unit){
				return !!unit.getRouteError();
			}).get();
		},


		/**
		 * Get ctrl route by id
		 *
		 * @param {String} id
		 * @return {Pilot.View}
		 */
		get: function (id){
			var item = this.getItem(id);
			return	item && item.unit;
		},


		/**
		 * Get route item
		 * @param {string} id
		 * @returns {Object}
		 */
		getItem: function (id){
			return	this.items[this.itemsIdx[id]];
		},


		/**
		 * Get url by route id
		 *
		 * @param	{String}	id
		 * @param	{Object}	[params]
		 * @param	{Object}	[extra]
		 * @return	{String}
		 */
		getUrl: function (id, params, extra){
			var route = this.getItem(id), keys, path, idx = 0;

			if( route ){
				params	= _extend({}, params, extra);
				keys	= route.keys;
				path	= route.path.replace(/:(\w+)\??(\/?)/g, function (_, key, slash, val){
								key	= keys[idx++];
								val	= key && params[key.name];
								return	val ? val + (slash||'') : '('+_+')';
							})
							.replace(/\(.*[\+\[\]]+.*\)+\??/g, '')
							.replace(/\(.*?:[^)]+\)+\??/g, '')
							.replace(/\(|\)\??/g, '')
							.replace(/\/+/g, '/')
							.replace(/[+*]$/g, '')
						;
			}

			return	(Router.pushState ? '' : this.options.hashBang) + path;
		},


		start: function (url){
			if( !this.started ){
				this._nav(url || this.request, false, true);
			}
		},


		_nav: function (url, byHistory, force){
			var
				  df	= Deferred()
				, req	= Router.parseURL(url.href || url.url || url, this.request.url, this)
			;

			this.started = true;
			this._navByHistory = !!byHistory;

			if( force || !this.activeRequest || this.activeRequest.url != req.url ){
				this.__ts = +new Date;
				this.trigger('beforeRoute', [req, this.__ts]);

				var units = this._getUnits(req, this.items);

				this.activeUnits	= units;
				this.activeRequest	= req;

				if( units.length ){
					this._loadUnits(req, units)
						.done(_bind(this, this._doRouteDone, req))
						.fail(_bind(this, this._doRouteFail, req))
						.then(df.resolve, df.reject)
					;
				} else {
					// not found
					this._doRouteDone(req);
					this.trigger('404', req);
					df.reject();
				}
			}
			else {
				df.resolve();
			}

			return	df;
		},


		/**
		 * Navigation bu url
		 *
		 * @param	{String}   url
		 * @param	{Boolean|Function}  [force]
		 * @param	{Function}	[callback]
		 * @return	{jQuery.Deferred}
		 */
		nav: function (url, force, callback){
			if( typeof force === 'function' ){
				callback = force;
				force = false;
			}

			return	this._nav(url.replace(/^#!/, ''), false, force).then(callback, callback);
		},


		/**
		 * Get request by route id & url
		 * @param  {String}  id
		 * @param  {Pilot.Request|String}  req
		 * @return {Pilot.Request}
		 */
		parseURL: function (id, req) {
			var item = this.getItem(id);

			req = Router.parseURL(req);
			item && _matchRoute(req, item.regexp, item.keys, req.params);

			return req;
		},


		/**
		 * Go to by id route
		 *
		 * @param	{String}	id
		 * @param	{Object}	[params]
		 * @return	{jQuery.Deferred}
		 */
		go: function (id, params){
			var url = this.getUrl(id, params);
			return	url ? this.nav(url) : Deferred().reject();
		},


		hasBack: function (){
			return	this.historyIdx > 0;
		},


		hasForward: function (){
			return	!!this.history[this.historyIdx + 1];
		},


		back: function (){
			if( this.hasBack() ){
				return	this._nav(this.history[--this.historyIdx], true);
			}
			return	Deferred().resolve();
		},


		forward: function (){
			if( this.hasForward() ){
				return	this._nav(this.history[++this.historyIdx], true);
			}
			return	Deferred().resolve();
		}
	});


	/**
	 * Parse URL method
	 *
	 * @param  {String} url
	 * @param  {String} [referrer]
	 * @param  {Pilot}  [router]
	 * @return {Pilot.Request}
	 */
	Router.parseURL = function(url, referrer, router){
		return	new Request(url, referrer, router);
	};


	/**
	 * @class   Pilot.Request
	 * @param   {String} url
	 * @param   {String} [referrer]
	 * @param   {Pilot} [router]
	 * @returns {Pilot.Request}
	 */
	function Request(url, referrer, router){
		url = url.toString();

		if( !_rhttp.test(url) ){
			if( '/' == url.charAt(0) ){
				url = '//' + location.host + url;
			}
			else {
				url	= location.pathname.substr(0, location.pathname.lastIndexOf('/') + 1) + url;
			}

			if( '//' == url.substr(0, 2) ){
				url = location.protocol + url;
			} else {
				url = location.host + url;
			}

			if( !_rhttp.test(url) ){
				url = location.protocol +'//'+ url;
			}
		}

		var
			  search	= (url.split('?')[1]||'').replace(/#.*/, '')
			, query		= _parseQueryString(search)
		;

		var
			  path		= url.replace(_rrclean, '')
			, hash		= url.replace(/^.*?#/, ''),
			, _this		= this
		;


		if( search ){
			search	= '?' + search;
		}

		url = url.substr(0, 7) + url.substr(7).split('?')[0].replace(/\/+/g, '/') + (search || '') + (hash ? '#' + hash : '');

		_this.url		= url;
		_this.href		= url;
		_this.query		= query;
		_this.search	= search;
		_this.path		= path;
		_this.pathname	= path;
		_this.hash		= hash;
		_this.params	= {};
		_this.referrer	= referrer;
		_this.router	= router;
	}
	Request.fn = Request.prototype = /** @lends Pilot.Request.prototype */ {
		constructor: Request,

		/**
		 * Check the current route
		 * @param   {String}  ids  id routes, separated by a space
		 * @returns {Boolean}
		 */
		is: function (ids) {
			ids = ids.split(_rspace);

			var units = this.router ? this.router.activeUnits : [],
				n = units.length,
				i = ids.length,
				r
			;

			while (i--) {
				r = n;
				while (r--) {
					if (units[r].id === ids[i]) {
						return true;
					}
				}
			}

			return false;
		},

		/**
		 * Get url by route id
		 * @param   {String} id   route id
		 * @param   {Object} [params]
		 * @returns {String}
		 */
		getUrl: function (id, params){
			var router = this.router;
			return	router !== void 0 ? router.getUrl(id, params, this.params || this.query) : null;
		},

		/**
		 * Clone current request
		 * @returns {Pilot.Request}
		 */
		clone: function (){
			return	new Request(this.url, this.referrer, this.router);
		},

		/**
		 * To absolute url
		 * @returns {String}
		 */
		toString: function (){
			return	this.url;
		}
	};


	/**
	 * Set `window.location`
	 * @param	{Pilot.Request}	 req
	 */
	Router.setLocation = function (req){
		if( Router.pushState && history.pushState ){
			history.pushState(null, document.title, req.url);
		}
		else {
			location.hash = '#!'+ req.path + req.search;
		}
	};


	/**
	 * Get location
	 * @return	{String}
	 */
	Router.getLocation = function (url){
		url = url || location.toString();
		if( !Router.pushState ){
			url = url.split(/#!?/).pop();
		}
		return	Router.parseURL(url).url;
	};


	Router.loadTemplate = function (url/**String*/, route/**Pilot.Route*/){
		throw "Router.loadTemplate("+url+", "+route+") -- should be implemented";
	};
	// Router;



	/**
	 * @class    Pilot.Route
	 * @extends  Emitter
	 */
	var Route = MyEmitter.extend(/** @lends Pilot.Route.prototype */{
		data: {},
		boundAll: [],
		paramsRules: {},
		subroutes: null,
		parentRouteId: null,

		__lego: function __(options){
			MyEmitter.prototype.__lego.call(this);

			_extend(this, options);

			if( this.loadDataOnce ){
				this.loadData = function (req){
					var ret = this.loadDataOnce(req);
					this.loadData = function (){ return ret; };
					return	ret;
				};
			}

			// ugly
			this.subroutes = this.subroutes || this.subviews;

			_each(this.boundAll, function (name){
				// Link method to context
				this[name] = this.bound(name);
			}, this);

			if( this.router && this.router.options.profile ){
				_profilerWrap(this, '__initSub', 0, 1, 'subroutes');

				_each({
					  init: 0 /* methodname => isEvent*/
					, loadData: 0
					, render: 0
					, trigger: 1
				}, function (isEvent, method){
					_profilerWrap(this, method, isEvent, 1);
				}, this);
			}

			this.on('routestart route routechange routeend', this.bound(function (evt, req){
				var type = evt.type.substr(5);
				type = type ? 'route' + type.charAt(0).toUpperCase()+type.substr(1) : 'route';
				_each(this.subroutes, function (view){
					view.trigger(type, req);
				});
			}));

			if( this.inited !== false ){
				this.__init();
			}
		},

		__init: function (){
			this.inited = true;
			this.trigger('beforeInit');
			this.init();
			this.subroutes && this.__initSub();
			this.trigger('init');
		},

		__initSub: function (){
			for( var name in this.subroutes ){
				this.subroutes[name].__init();
			}
		},

		_exception: function (method, text){
			throw '['+this.uniqId+'.'+method+']: '+text;
		},

		isActive: function (){
			return	true;
		},

		bound: function (fn){
			if( typeof fn === 'string' ){
				if( this[fn] === undef ){
					this._exception('bound', fn + ' -- method not found');
				}
				fn = this[fn];
			}

			return	_bind(this, fn);
		},

		setRouteError: function (err){
			this._routeError = err;
			return	this;
		},

		getRouteError: function (){
			return	this._routeError;
		},

		/** @protected */
		init: noop,

		/** @protected */
		loadData: noop,

		/** @protected */
		loadDataOnce: null,

		/** @protected */
		destroy: noop,

		getUrl: function (id, params, extra){
			if( typeof id != 'string' ){
				extra = params;
				params = id;
				id = this.id;
			}
			return	this.router.getUrl(id, params, extra);
		},

		setTemplate: function (template/**Function*/){
			this.template = template;
			return	this;
		},

		setLoadedData: function (data){
			this.loadedData = data;
			return	this;
		},

		getLoadedData: function (){
			return	this.loadedData;
		},

		setData: function (data, merge){
			if( merge ){
				_extend(this.data, data);
			} else {
				this.data = data;
			}
			return	this;
		},

		getData: function (){
			return	this.data;
		},

		getRouteName: function (){
			return	  (this.parentRoute ? this.parentRoute.getRouteName()+'.' : '')
					+ (this.id || this.subrouteName  || this.uniqId)
			;
		},

		getParentRoute: function (){
			return	this.router.get(this.parentRouteId);
		}

	});
	// Route;



	/**
	 * @class    Pilot.View
	 * @extends  Pilot.Route
	 */
	var View = Route.extend(/** @lends Pilot.View.prototype */{
		el: null,
		$el: $(),

		tag: null,
		tagName: null,
		className: '',
		parentNode: null,
		template: null,
		templateUrl: null,
		toggleEffect: 'toggle',

		events: {},

		__init: function __() {
			var el = this.el,
				parentNode = this.parentNode
			;

			this.inited	= true;
			this.__init	= noop;

			if( el ){
				if (typeof el === 'string') {
					if (!parentNode) {
						parentNode = this.getParentRouteNode();
					}
					el = $(el, parentNode);
				}
				else if (el.nodeType) {
					el = $(el);
				}

				this.setElement(el);
			}
			else if( this.tagName || this.tag ){
				var tag = this.tagName, className = this.className;

				if( this.tag ){
					tag = this.tag.match(/^(#[^\s]+)?\s*([^\.]+)\.?([^$]+)?/);
					if( tag[1] ){ parentNode = tag[1];}
					if( tag[3] ){ className = tag[3].split('.').join(' '); }
					tag	= tag[2];
				}

				this.el  = document.createElement(tag);
				this.$el = $(this.el);

				if( className ){
					this.$el.addClass(className);
				}

				if( parentNode ){
					if( $.isReady ){
						this.$el.appendTo(parentNode);
					}
					else {
						$(this.bound(function(){
							this.$el.appendTo(parentNode);
						}));
					}
				}
			}
			else if( this.$el ){
				// if use jQuery < 1.4: $() === $(document)
				this.$el[0] = undef;
				this.$el.length = 0;
			}


			this.on('routestart routeend', this.bound(function (evt, req){
				this._toggleView(evt.type != 'routeend', req);
			}));


			// Call the parent method
			Route.prototype.__init.call(this);


			// Init subroutes
			_each(this.subroutes, function (view){
				view.parentNode = this.el;
				view.__init();
			}, this);
		},


		_toggleView: function (state, req){
			var effect = View.toggleEffect[this.toggleEffect];
			this.$el && effect && effect.call(this, this.$el, state, req);
		},


		getParentRouteNode: function () {
			var el, route = this;

			while (route = route.getParentRoute()) {
				el = route.el;
				if (el && el.nodeType) {
					return el;
				}
			}

			return null;
		},


		setElement: function (el){
			if( el ){
				this.$el = el.jquery ? el : $(el);
				this.delegateEvents();
			}
			else {
				this.undelegateEvents();

				this.$el[0] = undef;
				this.$el.length = 0;
			}

			this.el	= this.$el[0];
			return	this;
		},


		delegateEvents: function (events){
			this.undelegateEvents();

			_each(events || this.events, function (fn, expr){
				expr = expr.match(/^([^\s]+)\s+(.+)/);
				this.$el.delegate(expr[2], expr[1] +'.delegateEvents'+ this.cid, this.bound(fn));
			}, this);

			return	this;
		},


		undelegateEvents: function (){
			if( this.$el && this.$el.unbind ){
				this.$el.unbind('.delegateEvents' + this.cid);
			}

			return	this;
		},


		$: function (sel){
			var $el = this.$el;

			if( sel !== void 0 ){
				$el	= typeof sel == 'string' ? $el.find(sel) : $(sel);
			}

			return	$el;
		},


		getHtml: function (data){
			if( data ){
				data = _extend({}, this.getData(), data);
			} else {
				data = this.getData();
			}

			return this.template(data);
		},


		render: function (){
			var html = this.getHtml();

			if( typeof html === 'string' ){
				this.trigger('beforeRender');
				this.$el.empty().each(function (){
					this.innerHTML = html;
				});
				this.trigger('render');
			}
		}
	});
	// View;


	/**
	 * Get/set toggle view effect
	 * @param {String} name
	 * @param {Function} [fn]
	 * @return {Function}
	 */
	View.toggleEffect = function (name, fn){
		if( fn ){
			View.toggleEffect[name] = fn;
		}
		return	View.toggleEffect[name];
	};


	// Preset: fade
	View.toggleEffect('fade', function ($el, state){
		$el[state ? 'fadeIn' : 'fadeOut']();
	});


	// Preset: fadeIn
	View.toggleEffect('fadeIn', function ($el){
		View.toggleEffect.fade($el, true);
	});


	// Preset: fadeOut
	View.toggleEffect('fadeOut', function ($el){
		View.toggleEffect.fade($el, false);
	});


	// Preset: show
	View.toggleEffect('show', function ($el, state){
		state && View.toggleEffect.toggle($el, true);
	});


	// Preset: toggle
	View.toggleEffect('toggle', function ($el, state){
		$el.css('display', state ? '' : 'none');
	});


	function _each(obj, fn, ctx){
		if( obj ){
			var i = 0, n = obj.length;
			if( (i in obj) && n !== undef ){
				for( ; i < n; i++ ){
					fn.call(ctx, obj[i], i, obj);
				}
			}
			else {
				for( i in obj ){
					if( obj.hasOwnProperty(i) ){
						fn.call(ctx, obj[i], i, obj);
					}
				}
			}
		}
	}


	function _extend(dst, src){
		var args = arguments, i = 1, n = args.length, key;
		dst = dst || {};

		for( ; i < n; i++ ){
			src = args[i];
			if( src && /object|function/.test(typeof src) ){
				for( key in src ){
					if( src.hasOwnProperty(key) ){
						dst[key] = src[key];
					}
				}
			}
		}

		return	dst;
	}



	function _parseQueryString(str){
		var query = {};

		if( typeof str === 'string' ){
			var vars = str.split('&'), i = 0, n = vars.length, pair, name, val;
			for( ; i < n; i++ ){
				pair	= vars[i].split('=');
				name	= pair[0];
				val		= pair[1] === void 0 ? '' : pair[1];

				try {
					val	= decodeURIComponent(val);
				}
				catch( _ ){
					val	= unescape(val);
				}

				if( name.length > 0 ){
					if( query[name] === void 0 ){
						query[name]	= val;
					}
					else if( query[name] instanceof Array ){
						query[name].push(val);
					}
					else {
						query[name] = [query[name], val];
					}
				}
			}
		}

		return	query;
	}


	function _profilerWrap(ctx, methodName, isEvent, isRoute, prefix){
		var originalFn = ctx[methodName];
		ctx[methodName] = function (event){
			var
				router = isRoute ? ctx.router : ctx, ret,
				label = (isRoute ? '#'+ctx.getRouteName()+'.' : '')
					+ (prefix || methodName)
					+ (isEvent ? '.'+event : '')
			;

			(!isEvent || event !== 'profile') && _timeStart(router, label);
			ret = originalFn.apply(ctx, arguments);
			(!isEvent || event !== 'profile') && _timeEnd(router, label);

			return	ret;
		};
	}


	function _profilerPrint(path, timers){
		var
			  i = 0, n = timers.length
			, groups = [], cur, next, dt
			, _colors = ['#ccc', '#666', '#333', '#c00', 'red']
		;

		for( ; i < n; i++ ){
			cur = timers[i];
			next = timers[i+1];

			if( next && cur[0] == next[0] && next[2] ){
				// one
				dt = cur[1] - timers[i-1][1];
				if( dt > 0.1 ){
					groups.push({ name: '<<between>>', dt: dt });
				}

				groups.push({ name: cur[0], dt: next[1] - cur[1] });
				i++;
			}
			else if( cur[2] ) {
				// Close
				groups.dt += cur[1];
				groups = groups.parent;
			}
			else {
				// Open
				var sub = [];
				sub.parent = groups;
				sub.name = cur[0];
				sub.dt = -cur[1];
				groups.push(sub);
				groups = sub;
			}
		}

		function toFixed(val){
			return	val.toFixed(4);
		}

		function print(group, depth){
			var i = 0, n = group.length;
			if( n ){
				console[depth && n > 2 && console.groupCollapsed ? 'groupCollapsed' : 'group'](group.name, '~', toFixed(group.dt));
				for( ; i < n; i++ ){
					print(group[i], 1);
				}
				console.groupEnd();
			} else {
				var dt = toFixed(group.dt);
				console.log(
					'%c '+group.name+': '+dt
					, 'color: '+ _colors[(dt < 1)+(dt>1)+(dt>4)+(dt>8)+(dt>10)]
						+ (dt > 20 ? '; font-weight: bold' : '')
				);
			}
		}

		groups[0].name = 'Pilot '+path;
		print(groups[0]);
	}


	/**
	 * Normalize the given path string,
	 * returning a regular expression.
	 * https://github.com/visionmedia/express/blob/master/lib/utils.js#L248
	 */
	function _pathRegexp(path, keys, rules){
		if( path instanceof RegExp ){ return path; }
		if( _isArray(path) ){ path = '('+ path.join('|') +')'; }

		path = path
			.concat('/?')
			.replace(/(\/\(|\(\/)/g, '(?:/')
			.replace(/(\/)?(\.)?:(\w+)(?:(\([^?].*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
				keys.push({
					  name: key
					, optional: !!optional
					, rule: rules[key]
				});

				slash = slash || '';

				return ''
					+ (optional ? '' : slash)
					+ '(?:'
					+ (optional ? slash : '')
					+ (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
					+ (optional || '')
					+ (star ? '(/*)?' : '')
				;
			})
			.replace(/([\/.])/g, '\\$1')
			.replace(/\*/g, '(.*)')
		;

		return new RegExp('^' + path + '$', 'i');
	}


	/**
	 * Check if this route matches `path`.
	 * https://github.com/visionmedia/express/blob/master/lib/router/route.js#L50
	 */
	function _matchRoute(req, regexp, keys, params){
		if( keys ){
			var i = 1, l, key, val, m = regexp.exec(req.path);

			if( !m ){
				return false;
			}

			for( l = m.length; i < l; ++i ){
				key = keys[i - 1];
				val = 'string' == typeof m[i] ? decodeURIComponent(m[i]) : m[i];

				if( key ){
					if( key.rule == null || key.rule(val, req) === true ){
						params[key.name] = val;
					}
					else {
						return	false;
					}
				}
			}

			return	true;
		}

		return regexp.test(req.path);
	}


	Router.utils = {
		  each: _each
		, extend: _extend
		, qs: {
			  parse: _parseQueryString
			, stringify: $.param // @todo: no use jQuery
		}
	};


	Router.access	= { extend: function (access){ _extend(this, access); } };
	Router.Route	= Route;
	Router.View		= View;
	Router.Class	= klass;
	Router.Emitter	= MyEmitter;
	Router.Request	= Request;


	/**
	 * Create application
	 * @param   {Object}  options
	 * @param   {Object}  [sitemap]
	 * @returns {Pilot}
	 */
	Router.create = function (options, sitemap){
		if( !sitemap ){
			sitemap = options;
			options = {};
		}


		// Prepare routes
		var routes = (function _build(sitemap, path, parent){
			var
				  key
				, val
				, route = {
					  id:	sitemap.id || ++gid
					, opts:	{ }
					, path:	path = path.replace(/\/\.?\/+/g, '/')
				}
				, routes = [route]
			;

			// Default view
			route.opts.el = sitemap.id ? '[data-view-id="'+ route.id +'"]' : null;

			if( parent ){
				route.opts.parentRouteId = parent.id;

				if( parent.paramsRules ){
					route.paramsRules = _extend({}, parent.paramsRules, route.paramsRules);
				}
			}

			if( 'function' === typeof sitemap ){
				route.opts.onRoute = function (evt, req){
					var scope = this.router.get(parent.id);
					sitemap.call(scope, req);
				};
			}
			else {
				for( key in sitemap ){
					val = sitemap[key];

					if( 'id' == key || 'ctrl' == key ){
						route[key] = val;
					}
					else if( '404' == key ){
						route.dir = true;
						route[key] = _build(val, path, route)[0];
					}
					else if( /^\.?\//.test(key) ){ // route path
						route.dir = true;
						routes.push.apply(routes, _build(val, path + key, route));
					}
					else {
						// route option
						route.opts[key] = val;
					}
				}
			}

			return	routes;
		})(sitemap, '/');


		// App view
		options.el = routes[0].opts.el || options.el;


		// Build application
		var app = new Router(options);
		_each(routes, function (route){
			var p404 = route['404'];

			route.opts.__dir = route.dir;

			app.addRoute(
				  route.id
				, route.path + (route.dir ? '?*' : '')
				, route.ctrl ? (route.ctrl.fn ? route.ctrl : View.extend(route.ctrl)) : View
				, route.opts
			);

			if( p404 ){
				p404.opts.__404 = true; // is 404 page
				p404.opts.isActive = function (routes){
					var i = 0, n = routes.length, route, p404;
					for( ; i < n; i++ ){
						route = routes[i];
						if( route.__404 ){
							p404 = route;
						}
						else if( !route.__dir ){
							return	false;
						}
					}
					return	this === p404;
				};

				// add 404 controller
				app.route(p404.id, p404.path+'*', p404.ctrl || View, p404.opts);
			}
		});


		return	app;
	};


	// Export
	Router.version	= '1.7.0';
	window.Pilot	= Router;

	if( typeof define === "function" && define.amd ){
		define(function (){ return Router; });
	}
	else if (module && module.exports) {
		module.exports = Router;
	} else {
		window["Pilot"] = Router;
	}

	if( window.ajs && ajs.loaded ){
		ajs.loaded('{pilot}Pilot');
	}
})(window);
