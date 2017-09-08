/*global Pilot, module, test, equal*/

QUnit.module('Pilot.create');

QUnit.test('404', function (assert) {
	var log = [];
	var app = Pilot.create({
		'404': function (req){
			log.push('404[root]:'+req.path)
		},

		'/': {
			init: function (){ log.push('init'); },
			onRoute: function (evt, req){ log.push(req.path); }
		},

		'/:page(foo|bar)': {
			'/': function (req){ log.push(req.params.page); },

			'/321/': {
				'/': function (req){ log.push(req.params.page+'/321'); },
				'404': function (req){ log.push('404[bar]:'+req.path); }

			},

			'404': function (req){ log.push('404[page]:'+req.path); }
		}
	});

	app.nav('/');
	app.nav('/foo/');
	app.nav('/foo/123/');
	app.nav('/bar/321/');
	app.nav('/bar/321/fail');
	app.nav('/bar/456');
	app.nav('/fail/');

	assert.equal(log.join('->'),
		'init->/' +
		'->foo->404[page]:/foo/123/' +
		'->bar/321->404[bar]:/bar/321/fail' +
		'->404[page]:/bar/456' +
		'->404[root]:/fail/'
	);
});

QUnit.test('access + referrer', function (assert) {
	var log = [];
	var isAuth = false;


	Pilot.access.extend({
		'auth': function (){ return isAuth; },
		'!auth': function (){ return !isAuth; }
	});


	var app = Pilot.create({
		'/': {
			id: 'index',
			onRoute: function (){ log.push('index'); }
		},

		'/login/': {
			id: 'login',
			accessPermission: '!auth',
			onRoute: function (evt, req){
				isAuth = true;
				log.push(req.path);
				this.router.nav(req.referrer);
			}
		},

		'/user/': {
			'/:id(\\d+)': {
				accessPermission: 'auth',
				accessDeniedRedirectTo: '/login/',
				onRoute: function (evt, req){ log.push(req.params.id); }
			},

			'404': function (req){ log.push('404:'+req.path); }
		},

		'404': function (req){ log.push(req.path+':404'); }
	});


	app.nav('/');
	app.nav('/user/123/');
	app.nav('/user/fail/');
	app.nav('/fail/');

	assert.equal(log.join('->'), 'index->/login/->123->404:/user/fail/->/fail/:404');
});

QUnit.test('app', function (assert) {
	var secretEl;
	var app = Pilot.create({
		el: '#app',

		subviews: {
			menu: {
				onRoute: function (evt, req){
					this.$('.active').removeClass('active');
					this.$('[href="#!'+req.path.split('/').slice(0, 2).join('/')+'"]').addClass('active');
				}
			}
		},

		'/': {
			id: 'index'
		},

		'/help/': {
			id: 'help',

			'/:details(foo|bar)/': {
				id: 'help-details',
				onRoute: function (evt, req){ this.$el.html(req.params.details); }
			},

			'404': { id: 'help-404' }
		},

		'/about/': {
			id: 'about',

			'/secret/': {
				onRoute: function () {
					secretEl = this.el;
				}
			}
		}
	});


	app.nav('/');
	assert.equal($('a.active').length, 1, 'active links (I)');
	assert.equal($('a.active').prop('href').split('#!')[1], '/', 'active href (index)');
	assert.ok($('[data-view-id="index"]').is(':visible'), 'index visible');
	assert.ok(!$('[data-view-id="help"]').is(':visible'), 'help hidded');

	app.nav('/help');
	assert.equal($('a.active').length, 1, 'active links (II)');
	assert.equal($('a.active').prop('href').split('#!')[1], '/help', 'active href (help)');
	assert.ok(!$('[data-view-id="index"]').is(':visible'), 'index hidden');
	assert.ok($('[data-view-id="help"]').is(':visible'), 'help visible');

	app.nav('/help/foo/');
	assert.equal($('a.active').prop('href').split('#!')[1], '/help', 'active href (help, II)');
	assert.ok($('[data-view-id="help"]').is(':visible'), 'help visible');
	assert.ok($('[data-view-id="help-details"]').is(':visible'), 'help-details visible');
	assert.ok($('[data-view-id="help-details"]').html(), 'foo');

	app.nav('/help/bar/');
	assert.ok($('[data-view-id="help-details"]').html(), 'bar');

	app.nav('/help/baz/');
	assert.ok(!$('[data-view-id="help-details"]').is(':visible'), 'help-details hidden');
	assert.ok($('[data-view-id="help-404"]').is(':visible'), '404 visible');

//	app.nav('/about/secret/');
//	equal(secretEl, $('[data-view-id="about"]')[0], 'secret');

	app.nav('/');
});
