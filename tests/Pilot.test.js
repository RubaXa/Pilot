/*jslint curly: false */
/*global jQuery, location, Pilot, module, test, expect, ok, equal, start, stop*/

(function ($){
	/**
	 *       ~~~ TESTS ~~~
	 */
	module('Pilot');

	test('route', function (){
		var Router = new Pilot;

		Router.route('/foo', function (evt, req){
			equal(evt.type, 'routestart');
			equal(req.path, '/foo');
		});

		Router.nav('/foo');
	});

	test('crazy params', function (){
		var Router = new Pilot, _log = {}, log = function (name, str){
			if( !_log[name] ) _log[name] = [];
			_log[name].push(str);
		};
		// /((show|link)/)?(home|links|shared|history|attaches|files)(/.*)

		Router.route('/foo', function (evt, req){
			log('foo', req.path);
		});

		Router.route('/:mode(show|link)', function (evt, req){
			log('mode', req.params.mode);
		});

		Router.route('/:mode(show|link)?/:storage(home|links|shared)', function (evt, req){
			log('mode?+storage', (req.params.mode || '')+':'+req.params.storage);
		});

		Router.route('/:mode(show|link)?/:storage(home|links|shared)/:id(*)?', function (evt, req){
			log('mode?+storage+id?', (req.params.mode || '')+':'+req.params.storage+':'+(req.params.id || ''));
		});

		Router.nav('/foo');

		// mode
		Router.nav('/bar');
		Router.nav('/show/');
		Router.nav('/bar/');
		Router.nav('/link');
		Router.nav('/show/');

		// mode?+storage
		Router.nav('/home');
		Router.nav('/show/home');
		Router.nav('/show/bar');
		Router.nav('/shared/');

		// // mode?+storage+id?
		Router.nav('/shared/myid');
		Router.nav('/links/my/id');
		Router.nav('/link/links/my/id');

		equal(_log['foo'].join('->'), '/foo');
		equal(_log['mode'].join('->'), 'show->link->show');
		equal(_log['mode?+storage'].join('->'), ':home->show:home->:shared');
		equal(_log['mode?+storage+id?'].join('->'), ':home:->show:home:->:shared:->:shared:myid->:links:my/id->link:links:my/id');
	});


	test('request.params', function (){
		expect(22);

		var Router = new Pilot;


		Router
			.route('/', function (evt, req){
				if( evt.type == 'routestart' ) equal(req.pathname, '/', 'root');
			})
			.route('/:page?', function (evt, req){
				if( evt.type == 'routestart' ) equal(req.pathname, '/', '/:page? == /');
				if( evt.type == 'routechange' ){
					equal(req.pathname, '/10', '/10');
					equal(req.params.page, '10', '/:page [page]');
					this.off();
				}
			})
			.route('/:number', function (evt, req){
				if( evt.type == 'routestart' ){
					equal(req.pathname, '/10', '/:number');
					equal(req.params.number, '10', '/:number [number]');
					this.off();
				}
			})
			.route('/:page/details/', function (evt, req){
				if( evt.type == 'routestart' ){
					equal(req.pathname, '/20/details/', '/:page/details/');
					equal(req.params.page, '20', '/:page/details/ [page]');
				}
			})
			.route('/:page/details/:id?', function (evt, req){
				if( evt.type == 'routechange' ){
					equal(req.pathname, '/25/details/30/', '/:page/details/:id?');
					equal(req.params.page, '25', '/:page/details/:id? [page]');
					equal(req.params.id, '30', '/:page/details/:id? [id]');
				}
			})
			.route('/coords/:x?/:y?', function (evt, req){
				if( evt.type == 'routestart' ) equal(req.pathname, '/coords/', '/coords/');
				if( evt.type == 'routechange' ){
					if( !this._next ){
						this._next = true;
						equal(req.pathname, '/coords/40', '/coords/:x?/:y?');
						equal(req.params.x, '40', '/coords/:x?/:y? [x]');
					}
					else {
						equal(req.pathname, '/coords/45/50/', '/coords/:x?/:y?');
						equal(req.params.x, '45', '/coords/:x?/:y? [x]');
						equal(req.params.y, '50', '/coords/:x?/:y? [y]');
					}
				}
			})
			.route('/post/:id(\\d+)', function (evt, req){
				if( evt.type == 'routeend' ){
					ok(true, 'routeend');
				}
				else {
					equal(req.path, '/post/1', 'post');
					equal(req.params.id, 1, 'post');
				}
			}, true)
			.route('/post/:id([a-z]+)', function (evt, req){
				equal(req.path, '/post/abc', 'post');
				equal(req.params.id, 'abc', 'post');
			})
		;

		Router.nav('/');
		Router.nav('/10');
		Router.nav('/20/details/');
		Router.nav('/25/details/30/');
		Router.nav('/coords/');
		Router.nav('/coords/40');
		Router.nav('/coords/45/50/');

		Router.nav('/post/1');
		Router.nav('/post/abc');
	});


	test('Route.paramsRules', function (){
		var Router = new Pilot, log = [];

		Router.route('/:userId?', {
			paramsRules: {
				userId: function (id){
					return id != 'auth';
				}
			},
			onRoute: function (evt, req){
				log.push(req.path);
			}
		});

		Router.route('/auth/', function (evt, req){ log.push('['+req.path+']'); });

		Router.nav('/123/');
		Router.nav('/auth/');
		Router.nav('/456/');

		equal(log.join(' -> '), '/123/ -> [/auth/] -> /456/');
	});


	test('Route.paramsRules + group', function (){
		var Router = new Pilot, log = [];

		Router
			.createGroup('/:x', {
				paramsRules: { x: function (v){ return v == 'x'; } },
				onRouteStart: function (evt, req){ log.push('['+req.path+']'); }
			})
				.route('/:y', {
					paramsRules: { y: function (v){ return v == 'y'; } },
					onRouteStart: function (evt, req){ log.push(req.path); }
				})
				.createGroup('/:y', {
					paramsRules: { y: function (v){ return v == 2; } },
					onRouteStart: function (evt, req){ log.push('['+req.path+']'); }
				})
					.route('/:z', {
						paramsRules: { z: function (v){ return v == 'z'; } },
						onRouteStart: function (evt, req){ log.push(req.path); }
					})
					.closeGroup()
				.route('/:y', {
					paramsRules: { y: function (v){ return v == 9; } },
					onRouteStart: function (evt, req){ log.push('!'+req.path+'!'); }
				})
		;

		Router.nav('/x/');
		Router.nav('/y/');

		Router.nav('/x/x/');
		Router.nav('/x/y/');

		Router.nav('/x/2/');
		Router.nav('/x/3/z/');
		Router.nav('/x/2/z/');

		Router.nav('/x/6/');
		Router.nav('/x/9/');

		equal(log.join(' -> '), '[/x/] -> [/x/x/] -> /x/y/ -> [/x/2/] -> [/x/2/z/] -> /x/2/z/ -> !/x/9/!');
	});


	/**
	 * Test: Navigate by "id"
	 */
	test('Router.getUrl', function (){
		var Router = new Pilot, noop = function(){};

		Router
			.route('blog', '/blog/:id?/:search?/(page/:page)?', noop)
			.route('blog-post', '/blog/post/:name([a-z]+)?', noop)
			.route('addressbook-my', '/addressbook/my/(letter/:letter?)', noop)
			.route('addressbook-user', '/addressbook/user/(letter/:letter)', noop)
			.route('addressbook-label', '/addressbook/label/:id/(letter/:letter)', noop)
			.route('addressbook-search', '/addressbook/search/:query(/letter/:letter)', noop)
		;

		Pilot.pushState = false;
		equal(Router.getUrl('blog'), '#!/blog/', 'blog [no]');
		equal(Router.getUrl('blog', { id: 1 }), '#!/blog/1/', 'blog [id=1]');
		equal(Router.getUrl('blog', { id: 1, search: 'abc' }), '#!/blog/1/abc/', 'blog [id,search]');
		equal(Router.getUrl('blog', { id: 1, search: 'abc', page: 123 }), '#!/blog/1/abc/page/123', 'blog [id,search,page]');

		equal(Router.getUrl('blog-post', { name: 'pilot' }), '#!/blog/post/pilot', 'blog-entry [name]');


		Pilot.pushState = true;
		equal(Router.getUrl('addressbook-my'), '/addressbook/my/', 'addressbook-my [no]');
		equal(Router.getUrl('addressbook-my', { letter: 1 }), '/addressbook/my/letter/1', 'addressbook-my [letter]');

		equal(Router.getUrl('addressbook-user'), '/addressbook/user/', 'addressbook-user [no]');
		equal(Router.getUrl('addressbook-user', { letter: 2 }), '/addressbook/user/letter/2', 'addressbook-user [letter]');

		equal(Router.getUrl('addressbook-label'), '/addressbook/label/', 'addressbook-user [no]');
		equal(Router.getUrl('addressbook-label', { id: 3 }), '/addressbook/label/3/', 'addressbook-user [id]');
		equal(Router.getUrl('addressbook-label', { letter: 4 }), '/addressbook/label/letter/4', 'addressbook-user [letter]');
		equal(Router.getUrl('addressbook-label', { id: 5, letter: 6 }), '/addressbook/label/5/letter/6', 'addressbook-user [id, letter]');

		equal(Router.getUrl('addressbook-search'), '/addressbook/search/', 'addressbook-search [no]');
		equal(Router.getUrl('addressbook-search', { query: 'abc' }), '/addressbook/search/abc', 'addressbook-search [query]');
		equal(Router.getUrl('addressbook-search', { letter: 'z' }), '/addressbook/search/letter/z', 'addressbook-search [letter]');
		equal(Router.getUrl('addressbook-search', { query: 'qwerty', letter: 'a' }), '/addressbook/search/qwerty/letter/a', 'addressbook-search [query, letter]');
	});



	/**
	 * Test: route events & singleton unit
	 */
	test('Route.onRoute* + Route.singleton = true', function (){
		var
			  Router = new Pilot
			, unit = {}
			, _log = []
			, getLog = function (){ return _log.join('\n'); }
			, addLog = function (unit, evt, req){
				_log.push('['+unit.name+':'+evt.type+':'+req.pathname+']');
			}
		;

		unit.First = Pilot.Route.extend({
			name: 'First',
			init: function (){ this.on('route', function (evt, req){ addLog(this, evt, req); }); },
			onRouteStart: function (evt, req){ addLog(this, evt, req); },
			onRouteEnd: function (evt, req){ addLog(this, evt, req); }
		});

		unit.Second	= unit.First.extend({ name: 'Second' });
		unit.Both	= unit.Second.extend({ name: 'Both', singleton: true });


		Router.createGroup('/first/')
			.route('.', unit.First)
			.route('.', unit.Both)
			.route(':name', unit.First, { name: 'FirstSub' })
		;

		Router.createGroup('/second')
			.route('.', unit.Second)
			.route('.', unit.Both)
		;

		equal(new unit.Both, new unit.Both, 'singleton');


		var log = [
			  '[First:routestart:/first/]'
			, '[First:route:/first/]'
			, '[Both:routestart:/first/]'
			, '[Both:route:/first/]'
		];


		Router.nav('/first/');
		equal(Router.request.pathname, '/first/', '"/first/" pathname');
		equal(getLog(), log.join('\n'), '"first" route');


		log.push(
			  '[First:routeend:/second/]'
			, '[Second:routestart:/second/]'
			, '[Second:route:/second/]'
			, '[Both:route:/second/]'
		);


		Router.nav('/second/');
		equal(Router.request.pathname, '/second/', '"/second/" pathname');
		equal(Router.referrer.pathname, '/first/', '"/second/" referrer');
		equal(getLog(), log.join('\n'), '"second" route');


		log.push(
			  '[Both:routeend:/first/sub]'
			, '[FirstSub:routestart:/first/sub]'
			, '[FirstSub:route:/first/sub]'
			, '[Second:routeend:/first/sub]'
		);


		Router.nav('/first/sub');
		equal(Router.request.pathname, '/first/sub', '"/first/sub" pathname');
		equal(Router.referrer.pathname, '/second/', '"/first/sub" referrer');
		equal(getLog(), log.join('\n'), '"sub" route');
	});


	/**
	 * Test: load data
	 */
	test('Route.loadData()', function (){
		var _log	= [];
		var Router	= new Pilot;


		var First	= Pilot.Route.extend({
			init: function (){
				this.on('routestart routechange routeend', this._route);
			},
			loadData: function (){
				return	true;
			},
			_route: function (evt){
				_log.push(evt.type.substr(5)+':first');
			}
		});

		var Second = First.extend({
			loadData: function (){
				var df = $.Deferred();
				setTimeout(df[this._again ? 'resolve' : 'reject'], 100);
				this._again = true;
				return	df;
			},
			_route: function (evt){
				_log.push(evt.type.substr(5)+':'+(this._again ? 'ok' : 'fail'));
			}
		});

		Router.route('first', First);
		Router.route('second', Second);

		// nav: "/first"
		Router.nav('/first');
		equal(_log.join('|'), 'start:first', 'first.onRouter');
		equal(Router.request.pathname, '/first', 'first.Router.request');
		equal(Router.referrer.pathname, location.pathname, 'first.Router.request');

		// nav again: "/first"
		Router.nav('/first');
		equal(_log.join('|'), 'start:first', 'again -> first.onRouter');
		equal(Router.request.pathname, '/first', 'again -> first.Router.request');

		// fail nav: "/second"
		stop();
		Router.nav('/second', function (){
			start();

			equal(_log.join('|'), 'start:first', 'first.onRouter -> fail second');
			equal(Router.request.pathname, '/first', 'first.Router.request -> fail second');

			// done nav: "/second"
			stop();
			Router.nav('/second', function (){
				start();
				equal(_log.join('|'), 'start:first|end:first|start:ok', 'second.onRouter');
				equal(Router.request.pathname, '/second', 'second.Router.request');
				equal(Router.referrer.pathname, '/first', 'second.Router.referrer');

				// again nav: "/second"
				stop();
				Router.nav('/second', true, function (){
					start();
					equal(_log.join('|'), 'start:first|end:first|start:ok|change:ok', 'again second.onRouter');
					equal(Router.request.pathname, '/second', 'again -> second.Router.request');
					equal(Router.referrer.pathname, '/first', 'again -> second.Router.referrer');
				});
			});
		});
	});


	test('Route.loadDataOnce + getLoadedData', function (){
		var log = [];
		var Router = new Pilot;

		Router.route('/once-sync/:id', {
			loadDataOnce: function (req){ return req.params.id; },
			onRoute: function (evt, req){ log.push(this.getLoadedData()+'-'+req.params.id); }
		});

		Router.route('/once-dfd/:id', {
			loadDataOnce: function (req){ return $.Deferred().resolve(req.params.id); },
			onRoute: function (evt, req){ log.push(this.getLoadedData()+'-'+req.params.id); }
		});

		Router.route('/mixed/:id', {
			loadData: function (req){
				var id = req.params.id;
				return (id % 2) ? $.Deferred().resolve(req.params.id) : id*10;
			},
			onRoute: function (evt, req){ log.push(this.getLoadedData()+'-'+req.params.id); }
		});

		Router.nav('/once-sync/foo');
		Router.nav('/once-sync/bar');

		Router.nav('/once-dfd/baz');
		Router.nav('/once-dfd/qux');

		Router.nav('/mixed/1');
		Router.nav('/mixed/2');
		Router.nav('/mixed/3');

		equal(log.join(' -> '),
			'foo-foo -> foo-bar -> ' +
			'baz-baz -> baz-qux -> ' +
			'1-1 -> 20-2 -> 3-3'
		);
	});


	/**
	 * Test simple App
	 */
	test('SimpleApp', function (){
		var
			  App = new Pilot
			, _log = []
			, onRoute = function (evt){ _log.push((this.id || this.name) +':'+ evt.type.substr(5)); }
			, unit = Pilot.Route.extend({
				init: function (){
					this.on('routestart routechange routeend', onRoute);
				}
			})
		;


		App
			.on('beforeroute', function (evt, req){ _log = [req.path]; })
			.createGroup('blog', '/blog/', unit)
				.route('*', unit, { name: 'left-col' })
				.route('.', unit, { name: 'list' })
				.route('blog-compose', 'compose/', unit)
				.route('blog-post', 'post/:id', unit)
				.closeGroup()
		;


		App.nav('/blog/');
		equal(_log.join(' -> '), '/blog/ -> blog:start -> left-col:start -> list:start', '/blog/');

		App.go('blog-compose');
		equal(_log.join(' -> '), '/blog/compose/ -> blog:change -> left-col:change -> list:end -> blog-compose:start', '/blog/compose/');

		App.back();
		equal(_log.join(' -> '), '/blog/ -> blog:change -> left-col:change -> list:start -> blog-compose:end', '/blog/');

		App.nav('/blog/post/10');
		equal(_log.join(' -> '), '/blog/post/10 -> blog:change -> left-col:change -> list:end -> blog-post:start', '/blog/post/10');

		App.go('blog-post', { id: 20 });
		equal(_log.join(' -> '), '/blog/post/20 -> blog:change -> left-col:change -> blog-post:change', '/blog/post/20');

//		console.log(App.items[1]);
//		App.nav('/user/');
//		equal(App.request.path, '/blog/post/20', 'not found')
	});


	/**
	 * Test: Router history
	 */
	test('Router.history', function (){
		var Router = new Pilot, _log = [];

		Router.on('route', function (evt, req){ _log.push(req.path.substr(1)); });

		Router.nav('/1');

		ok(!Router.hasBack(), 'hasBack = false');
		ok(!Router.hasForward(), 'hasForward = false');

		Router.nav('/2');
		ok(Router.hasBack(), 'hasBack = true');
		ok(!Router.hasForward(), 'hasForward = false');
		equal(Router.history.length, 2);
		ok(!!~Router.history.join('').indexOf('/2'));

		Router.back();
		Router.back(); // nothing

		ok(!Router.hasBack(), 'hasBack = false');
		ok(Router.hasForward(), 'hasForward = true');
		equal(Router.history.length, 2);
		equal(Router.request.path, '/1');

		Router.forward();

		ok(Router.hasBack(), 'hasBack = true');
		ok(!Router.hasForward(), 'hasForward = false');
		equal(Router.history.length, 2);
		equal(Router.request.path, '/2');

		Router.nav('/3');
		Router.nav('/4');
		Router.nav('/5');

		equal(_log.join(' -> '), '1 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5', 'nav x 5');
		equal(Router.history.length, 5, 'history = 5');

		Router.back();
		Router.back();

		equal(_log.join(' -> '), '1 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5 -> 4 -> 3', 'back x 2');
		equal(Router.history.length, 5, 'history = 5');

		Router.forward();
		Router.forward();
		Router.forward();
		Router.forward();
		Router.forward();

		equal(_log.join(' -> '), '1 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5 -> 4 -> 3 -> 4 -> 5', 'forward x 5');
		equal(Router.history.length, 5, 'history = 5');

		Router.nav('/6');

		equal(_log.join(' -> '), '1 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5 -> 4 -> 3 -> 4 -> 5 -> 6', 'nav x 1');
		equal(Router.history.length, 6, 'history = 6');

		Router.back();
		Router.back();
		Router.back();
		Router.back();
		Router.back();

		ok(!Router.hasBack(), 'hasBack = false');
		ok(Router.hasForward(), 'hasForward = true');

		Router.route('*', {
			loadData: function (){
				var df = $.Deferred();
				setTimeout(df.resolve, 28);
				return	df;
			}
		});

		stop();
		Router.nav('/bing').done(function (){
			start();

			ok(Router.hasBack(), 'hasBack = true');
			ok(!Router.hasForward(), 'hasForward = false');

			equal(Router.history.length, 2, 'history = 2');
			equal(Pilot.parseURL(Router.history[0]).path, '/1', '/1 -- ok');
			equal(Pilot.parseURL(Router.history[1]).path, '/bing', '/bing -- ok');

			// async back
			Router.back().done(function (){
				ok(!Router.hasBack(), 'hasBack = false');
				ok(Router.hasForward(), 'hasForward = true');
			});
		});
	});


	test('nav call x NN', function (){
		var log = [];
		var Router = new Pilot;

		Router.route('/blog/', {
			loadData: function (){
				var df = $.Deferred();
				log.push('loadData');
				setTimeout(function (){
					log.push('resolve');
					df.resolve();
				}, 500);
				return	df;
			},
			onRoute: function (evt){
				log.push(evt.type);
			}
		});

		Router.on('beforeroute route', function (evt){
			log.push('['+evt.type+']');
		});

		Router.nav('/blog/');
		Router.nav('/blog/');

		setTimeout(function (){
			Router.nav('/blog/');
		}, 200);

		stop();
		setTimeout(function (){
			start();
			equal(log.join('->'), '[beforeroute]->loadData->resolve->route->[route]');
		}, 700);
	});


	test('errors', function (){
		var log = [];
		var Router = new Pilot({ production: true });

		Router.on('error', function (evt, err){
			log.push(err);
		});

		Router.route('LOAD', '/load', { loadData: function (){ throw "e:load"; } });
		Router.route('ROUTE', '/route/:id?', {
			onRouteStart: function (){ throw "e:start"; },
			onRoute: function (){ throw "e:route"; },
			onRouteEnd: function (){ throw "e:end"; }
		});
		Router.route('ROUTE-123', '/route/123', { onRouteStart: function (){ throw "e:123"; } });

		Router.nav('/load');
		equal(log.join('->'), 'e:load');
		equal(Router.getFailRoutes()[0].id, 'LOAD');
		equal(Router.getFailRoutes().length, 1);

		Router.nav('/route');
		equal(log.join('->'), 'e:load->e:start->e:route');
		equal(Router.getFailRoutes()[0].id, 'ROUTE');
		equal(Router.getFailRoutes().length, 1);

		Router.nav('/route/123');
		equal(log.join('->'), 'e:load->e:start->e:route->e:route->e:123');
		equal(Router.getFailRoutes()[0].id, 'ROUTE');
		equal(Router.getFailRoutes()[1].id, 'ROUTE-123');
		equal(Router.getFailRoutes().length, 2);

		Router.nav('/exit');
		equal(log.join('->'), 'e:load->e:start->e:route->e:route->e:123->e:end');
		equal(Router.getFailRoutes().length, 0);
	});


	test('subroutes & subviews', function (){
		var log = [];
		var Router = new Pilot;
		var ctrl = {};

		ctrl.init = function (){
			log.push(this.getRouteName() + '.init');
		};

		ctrl.loadData = function (req){
			log.push(this.getRouteName() +'.load:'+ req.path);
		};

		ctrl.onRouteStart = ctrl.onRoute = ctrl.onRouteChange = ctrl.onRouteEnd = function (evt, req){
			log.push(this.getRouteName() +'.'+ evt.type +':'+ req.path);
		};

		Router.route('idx', '/', {
			subroutes: {
				menu: Pilot.Route.extend(ctrl)
			}
		});

		Router.route('sub', '/:name', Pilot.View.extend({
			subviews: {
				content: Pilot.Route.extend(ctrl)
			}
		}));

		log = [];
		Router.nav('/');
		equal(log.join('->'), 'idx.menu.load:/->idx.menu.init->idx.menu.routestart:/->idx.menu.route:/');

		log = [];
		Router.nav('/1/');
		Router.nav('/2/');
		Router.nav('/exit/exit/');
		equal(log.join('->'),
			'sub.content.load:/1/->idx.menu.routeend:/1/' +
			'->sub.content.init->sub.content.init->sub.content.routestart:/1/->sub.content.route:/1/' +
			'->sub.content.load:/2/->sub.content.route:/2/->sub.content.routechange:/2/' +
			'->sub.content.routeend:/exit/exit/');
	});


	test('req.is', function () {
		var log = [];
		var Router = Pilot.create({
			el: document.createElement('div'),

			'/': {
				'/': {
					id: 'idx',
					onRoute: function (evt, req) {
						log.push(this.id + ':' + req.path + '['+req.is('idx')+']');
					}
				},

				'/catalog/': {
					id: 'catalog',
					onRoute: function (evt, req) {
						log.push(this.id + ':' + req.path + '[' + [
							req.is('idx'),
							req.is('catalog')
						].join(',') + ']');
					},

					'/:category/': {
						id: 'category',
						paramsRules: {
							category: function (val){
								return !/^\d+$/.test(val);
							}
						},
						onRoute: function (evt, req) {
							log.push(this.id + ':' + req.path + '[' + [
								req.is('idx'),
								req.is('catalog'),
								req.is('category')
							].join(',') + ']');
						}
					},

					'/:id/': {
						id: 'product',
						paramsRules: {
							id: function (val){
								return /^\d+$/.test(val);
							}
						},
						onRoute: function (evt, req) {
							log.push(this.id + ':' + req.path + '[' + [req.is('idx category product')].join(',') + ']');
						}
					}
				},

				'/help/': {
					id: 'help',
					onRoute: function (evt, req) {
						log.push(this.id + ':' + req.path + '[' + [req.is('help')].join(',') + ']');
					}
				}
			}
		});


		Router.nav('/');
		Router.nav('/catalog/');
		Router.nav('/catalog/mushrooms/');
		Router.nav('/catalog/12345/');
		Router.nav('/help/');

		equal(log.join('\n'), [
			'idx:/[true]',
			'catalog:/catalog/[false,true]',
			'catalog:/catalog/mushrooms/[false,true]',
			'category:/catalog/mushrooms/[false,true,true]',
			'catalog:/catalog/12345/[false,true]',
			'product:/catalog/12345/[true]',
			'help:/help/[true]'
		].join('\n'));
	});
})(jQuery);
