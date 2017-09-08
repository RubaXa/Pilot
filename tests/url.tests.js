define(['../src/url', './urls'], function (Url, urls) {
	QUnit.module('Url');

	// https://developer.mozilla.org/en-US/docs/Web/API/URLUtils
	var URLUtils = window.URL;
	var isPhantomJS = /phantom/i.test(navigator.userAgent);


	function DOMUrl(href) {
		var a = document.createElement('a');
		a.href = href || location.toString();
		return a;
	}

	function fix(attr, value) {
		if (isPhantomJS) {
			value = (value == null) ? '' : value;
			value = (value == '0') ? '' : value;
		}

		return value;
	}

	var cases = [
		//null,
		'about:blank',
		'http://rubaxa.org/',
		'ftp://foo:bar@rubaxa.org/',
		'http://rubaxa.org/',
		'https://rubaxa.org/',
		'http://rubaxa.org/foo',
		'http://rubaxa.org/foo/bar?query',
		'http://rubaxa.org/foo/bar?foo?bar',
		'http://rubaxa.org/foo/bar#foo?foo=1',
		'http://rubaxa.org///foo/////bar#foo?foo=1',
		'#hash'
	];

	// URL vs. URLUtils
	cases.forEach(function (x, i) {
		QUnit.test('URLUtils: ' + (x || 'without arguments'), function (assert) {
			var actual = new Url(x);
			var expected = new URLUtils(x);


			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				if (isPhantomJS) {
					// Не работает нормально полифил, так что только code coverage
					assert.ok(true);
				} else {
					var value = expected[attr];
					assert.equal(actual[attr], fix(attr, i ? value : (value || '').replace('/', '')), attr); // "/" так надо для `about:blank`
				}
			});
		});
	});

	// URL vs. URLUtils(url, relative)
	[
		'foo',
		'/foo',
		'?query',
		'#hash'
	].forEach(function (x) {
		QUnit.test('URLUtils(url, relative): ' + (x || 'without arguments'), function (assert) {
			var actual = new Url(x, 'http://mail.ru/');
			var expected = new URLUtils(x || '', 'http://mail.ru/');

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				if (isPhantomJS) {
					// Не работает нормально полифил, так что только code coverage
					assert.ok(true);
				} else {
					assert.equal(actual[attr], expected[attr], attr);
				}
			});
		});
	});

	// URL vs. <a/>
	cases.forEach(function (x) {
		QUnit.test('<a/>: ' + (x || 'without arguments'), function (assert) {
			var actual = new Url(x);
			var expected = DOMUrl(x);

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				if (isPhantomJS) {
					// Не работает нормально полифил, так что только code coverage
					assert.ok(true);
				} else {
					assert.equal(actual[attr], expected[attr], attr);
				}
			});
		});
	});

	QUnit.test('without protocol', function (assert) {
		var href = '//mail.ru/';
		assert.equal(new Url(href).href, new URLUtils(href).href, 'URL vs. URLUtils');
		assert.equal(new Url(href).href, DOMUrl(href).href, 'URL vs. <a/>');
	});


	// Check urls
	urls.forEach(function (x) {
		QUnit.test(x, function (assert) {
			assert.equal(new Url(x).href, new URLUtils(x).href, 'URL vs. URLUtils');
			assert.equal(new Url(x, location).href, DOMUrl(x).href, 'URL vs. <a/>');
		});
	});


	QUnit.test('/messages/(:type|folder/:id)', function (assert) {
		var pattern = '/messages/(:type|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		assert.equal(matcher.source, '^\\/messages\\/(?:(?:([^\\/]+))|folder\\/(?:([^\\/]+)))\\/*$', 'regexp');
		assert.deepEqual(matcher.keys, [
			{"name": "type", "optional": false},
			{"name": "id", "optional": false}
		], 'params');

		// Тестируем `type`
		assert.equal(Url.match(pattern), null, 'match - null');
		assert.deepEqual(Url.match(pattern, '/messages/'), null, '{}');
		assert.deepEqual(Url.match(pattern, '/messages/inbox'), {type: 'inbox'}, 'type - inbox');
		assert.deepEqual(Url.match(pattern, '/messages/inbox/'), {type: 'inbox'}, 'type - inbox');
		assert.deepEqual(Url.match(pattern, '/messages/inbox//'), {type: 'inbox'}, 'type - inbox');
		assert.deepEqual(Url.match(pattern, '/messages/inbox/////'), {type: 'inbox'}, 'type - inbox');

		// Тестируем `id`
		assert.deepEqual(Url.match(pattern, '/messages/folder/123'), {id: '123'});
		assert.deepEqual(Url.match(pattern, '/messages/folder/123/'), {id: '123'});
		assert.deepEqual(Url.match(pattern, '/messages/folder/123////'), {id: '123'});
	});


	QUnit.test('/messages/(:type?|folder/:id)', function (assert) {
		var pattern = '/messages/(:type?|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		assert.equal(matcher.source, '^\\/messages\\/(?:(?:([^\\/]+))?|folder\\/(?:([^\\/]+)))\\/*$', 'regexp');
		assert.deepEqual(matcher.keys, [
			{"name": "type", "optional": true},
			{"name": "id", "optional": false}
		], 'params');
		assert.deepEqual(Url.match(pattern, '/messages/'), {}, '{}');
		assert.deepEqual(Url.match(pattern, '/messages/spam'), {type: 'spam'}, '{}');
		assert.deepEqual(Url.match(pattern, '/messages/folder/123'), {id: '123'}, '{}');
	});


	QUnit.test('/:mode(foo|bar)', function (assert) {
		var pattern = '/:mode(foo|bar)';
		var matcher = Url.toMatcher(pattern);

		assert.equal(matcher.source, '^\\/(?:(foo|bar))\\/*$');
		assert.deepEqual(matcher.keys, [{"name": "mode", "optional": false}]);
		assert.deepEqual(Url.match(pattern, '/'), null);
		assert.deepEqual(Url.match(pattern, '/foo'), {mode: 'foo'});
		assert.deepEqual(Url.match(pattern, '/bar/'), {mode: 'bar'});
		assert.deepEqual(Url.match(pattern, '/baz/'), null);
	});


	QUnit.test('/:page/details/:id?', function (assert) {
		var pattern = '/:page/details/:id?';
		var matcher = Url.toMatcher(pattern);

		assert.equal(matcher.source, '^\\/(?:([^\\/]+))\\/details(?:\\/([^\\/]+))?\\/*$');
		assert.deepEqual(matcher.keys, [{"name": "page", "optional": false}, {"name": "id", "optional": true}]);
		assert.deepEqual(Url.match(pattern, '/'), null);
		assert.deepEqual(Url.match(pattern, '/foo/details/'), {page: 'foo'});
		assert.deepEqual(Url.match(pattern, '/foo/details/123'), {page: 'foo', id: '123'});
		assert.deepEqual(Url.match(pattern, '/details/123'), null);
	});


	QUnit.test('/:folder(foo|\\d+)?', function (assert) {
		var pattern = '/:folder(foo|\\d+)?';
		var matcher = Url.toMatcher(pattern);

		assert.equal(matcher.source, '^(?:\\/(foo|\\d+))?\\/*$');
	});

	QUnit.test('query methods', function (assert) {
		var req = new Url('https://mail.ru/?foo&bar=baz');

		assert.equal(req.query.foo, '');
		assert.equal(req.query.bar, 'baz');

		req.addToQuery({qux: 'Y'});
		assert.equal(req.query.qux, 'Y');

		req.setQuery('qux=N&zzz');
		assert.equal(req.query.qux, 'N');
		assert.equal(req.query.zzz, '');

		req.removeFromQuery('zzz');
		assert.equal(req.query.zzz, void 0);

		req.removeFromQuery(['foo', 'bar']);
		assert.equal(req.query.zzz, void 0);

		req.addToQuery({qux: null, 's"t"r': '<%^&>'});
		assert.equal(req + '', 'https://mail.ru/?s%22t%22r=%3C%25%5E%26%3E');

		req.setQuery({}, true);
		assert.equal(req + '', 'https://mail.ru/');
	});
});
