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

/*global window, define, unescape*/
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

		, $			= window.jQuery || window.Zepto || window.ender || noop
		, defer		= $.Deferred
		, history	= window.history
		, document	= window.document
		, location	= window.location

		, _rhttp	= /^(https?|file)/i
		, _slice	= [].slice
		, _toStr	= {}.toString
		, _bind		= function (ctx, fn){
			var args = _slice.call(arguments, 2);
			return	fn.bind ? fn.bind.apply(fn, [ctx].concat(args)) : function (){
				return fn.apply(ctx, args.concat(_slice.call(arguments)));
			};
		}

		, _isArray	= Array.isArray || $.isArray
		, _when = function (args){
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
			_extend(Ext.fn = Ext.prototype, methods);

			Ext.fn.__fn = Ext.fn.__super__ = this.fn;
			Ext.fn.__self = Ext.fn.__self__ = New.fn.constructor = Ext;

			return	Ext;
		};

		return	New;
	};


	/**
	 * @class	Emitter
	 */
	var Emitter = klass({
		__lego: function (){
			var $emitter = $(this);

			_each({ on: 'bind', off: 'unbind', fire: 'triggerHandler' }, function (exportName, originalMethod){
				this[originalMethod] = function (){
					$emitter[exportName].apply($emitter, arguments);
					return	this;
				};
			}, this);
		},


		emit: function (name, args){
			var
				  method = ('on-'+name).replace(/-(.)/g, function (a, b){ return b.toUpperCase(); })
				, evt = $.Event(name.replace(/-/g, ''))
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




	/**
	 * @class	Pilot
	 */
	var Router = Emitter.extend({

		/**
		 * @constructor
		 * @param	{Object}	options
		 */
		__lego: function (options){
			// call the parent method
			Emitter.fn.__lego.call(this);

			this.options	= options = _extend({
				  el: null
				, selector: 'a[href],[data-nav]'
				, basePath: '/'
				, production: window.Pilot && window.Pilot.production
				, useHistory: false
			}, options);

			this.items		= [];
			this.itemsIdx	= {};

			this.request	=
			this.referrer	= Router.parseURL( Router.getLocation() );

			this.history	= [];
			this.historyIdx	= 0;

			if( options.useHistory ){
				$(window).bind('popstate hashchange', _bind(this, function (){
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

				var _navFn = this.nav;
				this.nav = function (){
					var _this = this, _timers = _this._profilerTimers = [];

					_timeStart(_this, 'Pilot');

					return	_navFn.apply(_this, arguments).always(function (){
						_timeEnd(_this, 'Pilot');
						_this.emit('profile', [_timers]);
						_profilerPrint(_this.request.path, _timers);
					});
				};
			}

			// TODO: use "$(el).on('click', options.selector, ...)" instead of deprecated ".delegate(...)"
			options.el && $(options.el).delegate(options.selector, 'click', _bind(this, function (evt){
				this.nav( Router.getLocation( evt.currentTarget.getAttribute('data-nav') || evt.currentTarget.getAttribute('href') ) );
				evt.preventDefault();
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
			if( $.type(path) !== 'regexp' ){
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
					_routeError(task, null);

					access = _getRouteAccess(task, req);
					accessDenied = task.accessDeniedRedirectTo && {
						  redirectTo: task.accessDeniedRedirectTo
						, redirectParams: task.requestParams
					};

					if( !access ){
						task.emit('access-denied', req);
						return defer().reject(accessDenied);
					}
					else if( access.then ){
						access.denied = accessDenied;
						accessQueue.push(access);
					}

					_each(task.subroutes, addSubRoute, task);

					if( task.loadData ){
						if( !access || !access.then ){
							if( production ){
								try {
									dfd = task.loadData(req, this._navByHistory);
								}
								catch( err ){
									dfd = defer().reject(err);
									err.name = 'loadData';
									this.emit('error', err, req);
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
						dfd.fail && dfd.fail(_bind(null, _routeError, task));
						queue.push(dfd);
					}

					delete req.params;
				}
			}

			if( accessQueue.length ){
				promise = defer();

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

			return	promise.promise();
		},


		_doRouteUnits: function (request/**Pilot.Request*/, items){
			var
				options = this.options,
				profile = options.profile,
				production = options.production,
				_tryEmit = _bind(this, function (unit, name, req){
					if( production ){
						try {
							unit.emit(name, req);
						} catch( err ){
							err.name = name.replace('-', '');
							this.emit('error', err, req);
							_routeError(unit, err);
						}
					}
					else {
						unit.emit(name, req);
					}
				})
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
						_tryEmit(unit, 'route-start', req);
					}
					else if( true ){
						// @todo: Проверить изменение параметров, если их нет, не вызывать событие
					}

					_tryEmit(unit, 'route', req);

					if( routeChange ){
						_tryEmit(unit, 'route-change', req);
					}
				}
				else if( (unit.active === true) && !~$.inArray(unit, this.activeUnits) ){
					unit.active = false;
					unit.request = req;
					_tryEmit(unit, 'route-end', req);
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

				// debatable, but there will be so.
				if( this.items.length ){
					this._doRouteUnits(req, this.items);
				}

				var delta = new Date - this.__ts;
				this.emit('route', [req, delta]);
//				this.log('Pilot.nav: '+ delta +'ms ('+ req.path + req.search +')');
			}
		},


		_doRouteFail: function (req/**Pilot.Request*/, opts/**Object*/){
			opts = opts || {};

			if( this.activeRequest === req ){
				var redirectTo = opts.redirectTo;

				this.activeRequest = null;
				this.emit('route-fail', req, opts);

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

					this.nav(redirectTo);
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
							.replace(/\(.*?:[^)]+\)+\??/g, '')
							.replace(/\(|\)\??/g, '')
							.replace(/\/+/g, '/')
						;
			}

			return	path;
		},


		start: function (url){
			if( !this.started ){
				this._nav(url || this.request, false, true);
			}
		},


		_nav: function (url, byHistory, force){
			var
				  df	= defer()
				, req	= Router.parseURL(url.href || url.url || url)
			;

			this.started = true;
			this._navByHistory = !!byHistory;

			if( force || !this.activeRequest || this.activeRequest.url != req.url ){
				this.__ts = +new Date;
				this.emit('before-route', [req, this.__ts]);

				var units = this._getUnits(req, this.items);

				// set request referrer
				req.referrer		= this.request.url;

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
					this.emit('404', req);
					df.reject();
				}
			}
			else {
				df.resolve();
			}

			return	df.promise();
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
			if( $.isFunction(force) ){
				callback = force;
				force = false;
			}

			return	this._nav(url, false, force).then(callback, callback);
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
			return	url ? this.nav(url) : defer().reject().promise();
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
			return	defer().resolve();
		},


		forward: function (){
			if( this.hasForward() ){
				return	this._nav(this.history[++this.historyIdx], true);
			}
			return	defer().resolve();
		}
	});


	/**
	 * Parse URL method
	 *
	 * @param {String} url
	 * @return {Pilot.Request}
	 */
	Router.parseURL = function(url){
		return	new Request(url);
	};


	/**
	 * @class	Pilot.Request
	 * @constructor
	 * @param {string} url
	 */
	function Request(url){
		if( !_rhttp.test(url) ){
			if( '/' == url.charAt(0) ){
				url = '//' + location.hostname + url;
			}
			else {
				url	= location.pathname.substr(0, location.pathname.lastIndexOf('/') + 1) + url;
			}

			if( '//' == url.substr(0, 2) ){
				url = location.protocol + url;
			} else {
				url = location.hostname + url;
			}

			if( !_rhttp.test(url) ){
				url = location.protocol +'//'+ url;
			}
		}

		url = url.substr(0, 7) + url.substr(7).replace(/\/+/g, '/');

		var
			  search	= (url.split('?')[1]||'').replace(/#.*/, '')
			, query		= _parseQueryString(search)
			, offset	= url.match(_rhttp)[0].length + 3 // (https?|file) + "://"
			, path		= url.substr(url.indexOf('/', offset)).replace(/\?.*/, '')
			, _this		= this
		;


		if( search ){
			search	= '?' + search;
		}

		_this.url		= url;
		_this.href		= url;
		_this.query		= query;
		_this.search	= search;
		_this.path		= path;
		_this.pathname	= path;
		_this.hash		= url.replace(/^[^#]+#/, '');
		_this.params	= {};
	}
	Request.fn = Request.prototype = {
		constructor: Request,
		clone: function (){
			return	new Request(this.url);
		},
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
		return	Router.parseURL(url).path;
	};
	// Router;



	/**
	 * @class	Pilot.Route
	 */
	var Route = Emitter.extend({
		data: {},
		boundAll: [],
		paramsRules: {},
		subroutes: null,

		__lego: function (options){
			Emitter.fn.__lego.call(this);

			_extend(this, options);

			// ugly
			this.subroutes = this.subroutes || this.subviews;

			_each(this.boundAll, function (name){
				// Link method to context
				this[name] = this.bound(name);
			}, this);

			if( this.router && this.router.options.profile ){
				_each({
					  init: 0 /* methodname => isEvent*/
					, loadData: 0
					, render: 0
					, emit: 1
				}, function (isEvent, method){
					_profilerWrap(this, method, isEvent, 1);
				}, this);
			}

			this.on('routestart route routechange routeend', this.bound(function (evt, req){
				var type = evt.type.substr(5);
				type = type ? 'route-' + type : 'route';
				_each(this.subroutes, function (view){
					view.emit(type, req);
				});
			}));

			if( this.inited !== false ){
				this.__init();
			}
		},

		__init: function (){
			this.inited = true;
			this.emit('beforeInit');
			this.init();
			this.emit('init');
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

		getRouteError: function (){
			return	this._routeError;
		},

		/** @protected */
		init: noop,

		/** @protected */
		loadData: noop,

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
		}

	});
	// Route;



	/**
	 * @class	Pilot.View
	 */
	var View = Route.extend({
		el: null,
		$el: $(),

		tag: null,
		tagName: null,
		className: '',
		parentNode: null,
		template: null,

		events: {},

		__init: function (){
			this.inited	= true;
			this.__init	= noop;

			if( this.el ){
				this.setElement($(this.el, this.parentNode));
			}
			else if( this.tagName || this.tag ){
				var tag = this.tagName, parentNode = this.parentNode, className = this.className;

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
			else {
				// if use jQuery < 1.4: $() === $(document)
				this.$el[0] = undef;
				this.$el.length = 0;
			}


			this.on('routestart.view routeend.view', this.bound(function (evt){
				this.toggleView(evt.type != 'routeend');
			}));


			// Call the parent method
			Route.fn.__init.call(this);

			// Init subroutes
			_each(this.subroutes, function (view){
				view.parentNode = this.el;
				view.__init();
			}, this);
		},


		toggleView: function (vis){
			this.$el && this.$el.css('display', vis ? '' : 'none');
		},


		setElement: function (el){
			this.undelegateEvents();

			if( el ){
				this.$el = $(el);
				this.delegateEvents();
			}
			else {
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
			this.$el && this.$el.unbind('.delegateEvents' + this.cid);
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
				this.emit('before-render');
				this.$el.empty().each(function (){
					this.innerHTML = html;
				});
				this.emit('render');
			}
		}
	});
	// View;



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

		if( typeof str == 'string' ){
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
					groups.push({ name: '<<beetwen>>', dt: dt });
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
				console[depth && n > 2 && console.groupCollapsed ? 'groupCollapsed' : 'group'](group.name+':', toFixed(group.dt)+'ms');
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
					if( !key.rule || key.rule(val, req) === true ){
						params[key.name] = val;
					}
					else {
						return	false;
					}
				} else {
					params.push(val);
				}
			}

			return	true;
		}

		return regexp.test(req.path);
	}


	function _routeError(route, error){
		route._routeError = error;
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
	Router.Emitter	= Emitter;
	Router.Request	= Request;


	// @export
	Router.version	= '1.3.0';
	window.Pilot	= Router;

	if( typeof define === "function" && define.amd ){
		define("Pilot", [], function (){ return Router; });
	}
})(typeof module !== 'undefined' && module.exports || window);
