define(['url', './urls'], function (Url, urls) {
	module('Url');

	// https://developer.mozilla.org/en-US/docs/Web/API/URLUtils
	var URLUtils = window.URL;


	function DOMUrl(href) {
		var a = document.createElement('a');
		a.href = href || location.toString();
		return a;
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
		test('URLUtils: ' + (x || 'without arguments'), function () {
			var actual = new Url(x),
				expected = new URLUtils(x)
			;

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				var value = expected[attr];
				equal(actual[attr], (i ? value : value.replace('/', '')), attr); // "/" так надо для `about:blank`
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
		test('URLUtils(url, relative): ' + (x || 'without arguments'), function () {
			var actual = new Url(x, 'http://mail.ru/'),
				expected = new URLUtils(x || '', 'http://mail.ru/')
			;

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				equal(actual[attr], expected[attr], attr);
			});
		});
	});


	// URL vs. <a/>
	cases.forEach(function (x) {
		test('<a/>: ' + (x || 'without arguments'), function () {
			var actual = new Url(x),
				expected = DOMUrl(x)
			;

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				equal(actual[attr], expected[attr], attr);
			});
		});
	});


	// Check urls
	urls.forEach(function (x) {
		test(x, function () {
			equal(new Url(x).href, new URLUtils(x).href, 'URL vs. URLUtils');
			equal(new Url(x, location).href, DOMUrl(x).href, 'URL vs. <a/>');
		});
	});


	test('/messages/(:type|folder/:id)', function () {
		var pattern = '/messages/(:type|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		equal(matcher.source, '^\\/messages\\/(?:(?:([^\\/]+))|folder\\/(?:([^\\/]+)))\\/*$', 'regexp');
		deepEqual(matcher.keys, [
			{"name": "type", "optional": false},
			{"name": "id", "optional": false}
		], 'params');

		// Тестируем `type`
		equal(Url.match(pattern), null, 'match - null');
		deepEqual(Url.match(pattern, '/messages/'), null, '{}');
		deepEqual(Url.match(pattern, '/messages/inbox'), {type: 'inbox'}, 'type - inbox');
		deepEqual(Url.match(pattern, '/messages/inbox/'), {type: 'inbox'}, 'type - inbox');
		deepEqual(Url.match(pattern, '/messages/inbox//'), {type: 'inbox'}, 'type - inbox');
		deepEqual(Url.match(pattern, '/messages/inbox/////'), {type: 'inbox'}, 'type - inbox');

		// Тестируем `id`
		deepEqual(Url.match(pattern, '/messages/folder/123'), {id: '123'});
		deepEqual(Url.match(pattern, '/messages/folder/123/'), {id: '123'});
		deepEqual(Url.match(pattern, '/messages/folder/123////'), {id: '123'});
	});


	test('/messages/(:type?|folder/:id)', function () {
		var pattern = '/messages/(:type?|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		equal(matcher.source, '^\\/messages\\/(?:(?:([^\\/]+))?|folder\\/(?:([^\\/]+)))\\/*$', 'regexp');
		deepEqual(matcher.keys, [
			{"name": "type", "optional": true},
			{"name": "id", "optional": false}
		], 'params');
		deepEqual(Url.match(pattern, '/messages/'), {}, '{}');
		deepEqual(Url.match(pattern, '/messages/spam'), {type: 'spam'}, '{}');
		deepEqual(Url.match(pattern, '/messages/folder/123'), {id: '123'}, '{}');
	});


	test('/:mode(foo|bar)', function () {
		var pattern = '/:mode(foo|bar)';
		var matcher = Url.toMatcher(pattern);

		equal(matcher.source, '^\\/(?:(foo|bar))\\/*$');
		deepEqual(matcher.keys, [{"name": "mode", "optional": false}]);
		deepEqual(Url.match(pattern, '/'), null);
		deepEqual(Url.match(pattern, '/foo'), {mode: 'foo'});
		deepEqual(Url.match(pattern, '/bar/'), {mode: 'bar'});
		deepEqual(Url.match(pattern, '/baz/'), null);
	});


	test('/:page/details/:id?', function () {
		var pattern = '/:page/details/:id?';
		var matcher = Url.toMatcher(pattern);

		equal(matcher.source, '^\\/(?:([^\\/]+))\\/details(?:\\/([^\\/]+))?\\/*$');
		deepEqual(matcher.keys, [{"name": "page", "optional": false}, {"name": "id", "optional": true}]);
		deepEqual(Url.match(pattern, '/'), null);
		deepEqual(Url.match(pattern, '/foo/details/'), {page: 'foo'});
		deepEqual(Url.match(pattern, '/foo/details/123'), {page: 'foo', id: '123'});
		deepEqual(Url.match(pattern, '/details/123'), null);
	});
});
