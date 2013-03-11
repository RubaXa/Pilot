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

/*global window, jQuery, define*/
(function (window, $){
	"use strict";

	var
		  gid		= 0
		, noop		= function (){}
		, undef		= void 0

		, history	= window.history
		, document	= window.document
		, location	= window.location

		, _rhttp	= /^(https?|file)/i
		, _slice	= [].slice
		, _toStr	= {}.toString
		, _bind		= function (ctx, fn){
			var args = _slice.call(arguments, 2);
			return	fn.bind ? fn.bind.apply(fn, [ctx].concat(args)) : function (){
				return fn.apply(ctx, args.concat(_slice(arguments)));
			};
		}
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

			Ext.fn.__self = New.fn.constructor = Ext;

			return	Ext;
		};

		return	New;
	};


	/**
	 * @class	EventEmitter
	 */
	var EventEmitter = klass({
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
			;

			evt.target = this;

			if( (this[method] === undef) || (this[method].apply(this, [evt].concat(args)) !== false) ){
				if( !evt.isImmediatePropagationStopped() ){
					return this.fire(evt, args);
				}
			}
		}
	});




	/**
	 * @class	Pilot
	 */
	var Router = EventEmitter.extend({

		/**
		 * @constructor
		 * @param	{Object}	options
		 */
		__lego: function (options){
			// call the parent method
			EventEmitter.fn.__lego.call(this);

			_extend(this, {
				  el: null
				, path: '/'
				, production: window.Pilot && window.Pilot.production
				, useHistory: false
			}, options);


			this.items		= [];
			this.itemsIdx	= {};

			this.request	=
			this.referrer	= Router.parseURL( Router.getLocation() );

			this.history	= [];
			this.historyIdx	= 0;

			if( options ){
				if( options.useHistory ){
					$(window).bind('popstate hashchange', _bind(this, function (){
						this.nav( Router.getLocation() );
					}));
				}

				options.el && $(options.el).delegate('a[href],[data-nav]', 'click', _bind(this, function (evt){
					this.nav(evt.currentTarget.href);
					evt.preventDefault();
				}));
			}

			this.on('error', _bind(this, function (evt, err){
				this.error(err.message +' at '+ err.line +'line in '+ (err.file || ''));
				this.log(err.stack);
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
				path = (this.path + (path == '.' ? '' : path)).replace(/\/\//, '/');
			}

			// path keys
			var keys = [], router = this, idx;

			if( isGroup ){
				router	= new Router({ path: path });
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
					, regexp:	_pathRegexp(path, keys)
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


		_getUnits: function (req, items){
			var units = [];

			_each(items, function (item){
				var unit = item.unit, params = [];

				if( _matchRoute(req.path, item.regexp, item.keys, params) ){
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


		_loadUnits: function (req, units){
			var
				  queue = []
				, task
				, addTask = function (unit){
					units.push(unit);
				}
			;

			// Clone
			units = units.concat();

			while( task = units.shift() ){
				if( task && task.isActive() ){
					_each(task.units, addTask);

					req.params = task.requestParams;

					if( task.loadData ){
						try {
							task = task.loadData(req, this._navByHistory);
						} catch( err ){
							err.name = 'loadData';
							this.emit('error', err);

							// exit
							return	$.Deferred().reject();
						}
					}

					if( $.isArray(task) ){
						units.push.apply(units, task);
					}
					else if( task ){
						queue.push(task);
					}
				}
			}

			return	$.when.apply($, queue);
		},


		_doRouteUnits: function (request, items){
			_each(items, function (item){
				var
					  unit = item.unit
					, routeChange = true
					, params = []
					, req = _extend({}, request)
				;

				req.params = params;
				unit.request = req;

				if( _matchRoute(req.path, item.regexp, item.keys, params) ){
					if( unit.inited !== true ){
						unit.__init();
					}

					if( unit.active !== true ){
						routeChange = false;
						unit.active = true;

						try {
							unit.emit('route-start', req);
						} catch( err ){
							err.name = 'routestart';
							this.emit('error', err, req);
						}
					}

					try {
						unit.emit('route', req);
					} catch( err ){
						err.name = 'route';
						this.emit('error', err, req);
						this.emit('routeerror', err, req);
					}

					if( routeChange ){
						try {
							unit.emit('route-change', req);
						} catch( err ){
							err.name = 'routechange';
							this.emit('error', err, req);
						}
					}
				}
				else if( (unit.active === true) && !~$.inArray(unit, this.activeUnits) ){
					unit.active = false;
					try {
						unit.emit('route-end', req);
					} catch( err ){
						err.name = 'routeend';
						this.emit('geterror', err, req);
					}
				}
			}, this);
		},


		_doRouteDone: function (req){
			if( this.activeRequest === req ){
				if( this.request.url != req.url ){
					this.referrer = this.request;

					if( this.useHistory  ){
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
					try {
						this._doRouteUnits(req, this.items);
					} catch( err ){
						err.name = 'route';
						this.emit('error', err);
					}
				}

				var delta = new Date - this.__ts;
				this.emit('route', [req, delta]);
				this.log('Pilot.nav: '+ delta +'ms ('+ req.path + req.search +')');
			}
		},


		_doRouteFail: function (req){
			if( this.activeRequest === req ){
				this.activeRequest = null;
				this.emit('route-fail', req);
			}
		},


		log: function (str){
			if( !this.production && window.console ){
				console.log(str);
			}
		},


		error: function (str){
			if( !this.production ){
				if( window.console && console.error ){
					console.error(str);
				} else {
					this.log(str);
				}
			}
		},


		/**
		 * Get route by id
		 *
		 * @param {String} id
		 * @return {Object}
		 */
		get: function (id){
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
			var route = this.get(id), keys, path, idx = 0;

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
				  df	= $.Deferred()
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
			return	url ? this.nav(url) : $.Deferred().reject().promise();
		},


		hasBack: function (){
			return	this.historyIdx > 0;
		},


		back: function (){
			if( this.hasBack() ){
				return	this._nav(this.history[--this.historyIdx], true);
			}
			return	$.Deferred().resolve();
		},


		hasForward: function (){
			return	!!this.history[this.historyIdx + 1];
		},


		forward: function (){
			if( this.hasForward() ){
				return	this._nav(this.history[++this.historyIdx], true);
			}
			return	$.Deferred().resolve;
		}
	});


	/**
	 * Parse URL method
	 *
	 * @param {String} url
	 * @return {Object}
	 */
	Router.parseURL = function(url){
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


		var
			  search = (url.split('?')[1]||'').replace(/#.*/, '')
			, query = {}
			, offset = url.match(_rhttp)[0].length + 3 // (https?|file) + "://"
			, path = url.substr(url.indexOf('/', offset)).replace(/\?.*/, '')
		;


		if( search ){
			_each(search.split('&'), function (part, tmp){
				tmp = part.split('=');
				query[tmp[0]] = decodeURIComponent(typeof tmp[1] === 'undefined' ? '' : tmp[1]);
			});
			search = '?' + search;
		}

		return	{
			  url:		url
			, href:		url
			, query:	query
			, search:	search
			, path:		path
			, pathname:	path
			, hash:		url.replace(/^[^#]+#/, '')
		};
	};


	/**
	 * Set `window.location`
	 * @param	{Object}	req
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
	Router.getLocation = function (){
		var url = location.toString();
		if( !Router.pushState ){
			url = url.split('#!').pop();
		}
		return	Router.parseURL(url).path;
	};
	// Router;



	/**
	 * @class	Pilot.Route
	 */
	var Route = EventEmitter.extend({
		data: {},
		boundAll: [],


		__lego: function (options){
			EventEmitter.fn.__lego.call(this);

			_extend(this, options);

			_each(this.boundAll, function (name){
				// Link method to context
				this[name] = this.bound(name);
			}, this);


			if( this.inited !== false ){
				this.__init();
			}
		},


		__init: function (){
			this.inited = true;
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

		/** @protected */
		init: noop,

		/** @protected */
		loadData: noop,

		/** @protected */
		destroy: noop,


		getUrl: function (id, params, extra){
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
			this.inited = true;

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
			if( src && typeof src == 'object' ){
				for( key in src ){
					if( src.hasOwnProperty(key) ){
						dst[key] = src[key];
					}
				}
			}
		}

		return	dst;
	}




	/**
	 * Normalize the given path string,
	 * returning a regular expression.
	 * https://github.com/visionmedia/express/blob/master/lib/utils.js#L248
	 */
	function _pathRegexp(path, keys, sensitive, strict){
		if( path instanceof RegExp ){ return path; }
		if( $.isArray(path) ){ path = '('+ path.join('|') +')'; }

		path = path
			.concat(strict ? '' : '/?')
			.replace(/(\/\(|\(\/)/g, '(?:/')
			.replace(/(\/)?(\.)?:(\w+)(?:(\([^?].*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
				keys.push({ name: key, optional: !! optional });
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

		return new RegExp('^' + path + '$', sensitive ? '' : 'i');
	}


	/**
	 * Check if this route matches `path`.
	 * https://github.com/visionmedia/express/blob/master/lib/router/route.js#L50
	 */
	function _matchRoute(path, regexp, keys, params){
		if( keys ){
			var i = 1, l, key, val, m = regexp.exec(path);

			if( !m ){
				return false;
			}

			for( l = m.length; i < l; ++i ){
				key = keys[i - 1];
				val = 'string' == typeof m[i] ? decodeURIComponent(m[i]) : m[i];

				if( key ){
					params[key.name] = val;
				} else {
					params.push(val);
				}
			}

			return	true;
		}

		return regexp.test(path);
	}


	Router.Route	= Route;
	Router.View		= View;


	// @export
	Router.version	= '1.0.0';
	window.Pilot	= Router;

	if( typeof define === "function" && define.amd ){
		define("Pilot", [], function (){ return Router; });
	}
})(window, jQuery);
