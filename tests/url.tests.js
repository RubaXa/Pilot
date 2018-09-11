/* global describe, beforeEach, test, expect */

const Url = require('../src/url');
const urls = require('./urls');

describe('Url', () => {

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
	test.each(cases)('URLUtils: %s', x => {
		var actual = new Url(x);
		var expected = new URLUtils(x);

		'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
			expect(actual[attr]).toBe(expected[attr]); // "/" так надо для `about:blank`
		});
	});

	// URL vs. URLUtils(url, relative)
	test.each([
		'foo',
		'/foo',
		'?query',
		'#hash'
	])('URLUtils(url, relative): %s', x => {
		var actual = new Url(x, 'http://mail.ru/');
		var expected = new URLUtils(x || '', 'http://mail.ru/');

		'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
			expect(actual[attr]).toBe(expected[attr]);
		});
	});

	// URL vs. <a/>
	test.each(cases)('<a/>: %s', x => {
		var actual = new Url(x);
		var expected = DOMUrl(x);

		'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
			expect(actual[attr]).toBe(expected[attr]);
		});
	});

	test('without protocol', () => {
		var href = '//mail.ru/';

		// URL vs. URLUtils
		expect(new Url(href).href).toBe(new URLUtils(href).href);
		// URL vs. <a/>
		expect(new Url(href).href).toBe(DOMUrl(href).href);
	});


	// Check urls
	test.each(urls)('Check url: %s', x => {
		// URL vs. URLUtils
		expect(new Url(x).href).toBe(new URLUtils(x).href);
		// URL vs. <a/>
		expect(new Url(x, location).href).toBe(DOMUrl(x).href);
	});


	test('/messages/(:type|folder/:id)', () => {
		var pattern = '/messages/(:type|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		expect(matcher.source).toBe('^\\/messages\\/(?:(?:([^\\/]+))|folder\\/(?:([^\\/]+)))\\/*$');
		expect(matcher.keys).toEqual([
			{"name": "type", "optional": false},
			{"name": "id", "optional": false}
		]);

		// Тестируем `type`
		expect(Url.match(pattern)).toBe(null);
		expect(Url.match(pattern, '/messages/')).toEqual(null);
		expect(Url.match(pattern, '/messages/inbox')).toEqual({type: 'inbox'});
		expect(Url.match(pattern, '/messages/inbox/')).toEqual({type: 'inbox'});
		expect(Url.match(pattern, '/messages/inbox//')).toEqual({type: 'inbox'});
		expect(Url.match(pattern, '/messages/inbox/////')).toEqual({type: 'inbox'});

		// Тестируем `id`
		expect(Url.match(pattern, '/messages/folder/123')).toEqual({id: '123'});
		expect(Url.match(pattern, '/messages/folder/123/')).toEqual({id: '123'});
		expect(Url.match(pattern, '/messages/folder/123////')).toEqual({id: '123'});
	});


	test('/messages/(:type?|folder/:id)', () => {
		var pattern = '/messages/(:type?|folder/:id)';
		var matcher = Url.toMatcher(pattern);

		expect(matcher.source).toBe('^\\/messages\\/(?:(?:([^\\/]+))?|folder\\/(?:([^\\/]+)))\\/*$');
		expect(matcher.keys).toEqual([
			{"name": "type", "optional": true},
			{"name": "id", "optional": false}
		]);
		expect(Url.match(pattern, '/messages/')).toEqual({});
		expect(Url.match(pattern, '/messages/spam')).toEqual({type: 'spam'});
		expect(Url.match(pattern, '/messages/folder/123')).toEqual({id: '123'});
	});


	test('/:mode(foo|bar)', () => {
		var pattern = '/:mode(foo|bar)';
		var matcher = Url.toMatcher(pattern);

		expect(matcher.source).toBe('^\\/(?:(foo|bar))\\/*$');
		expect(matcher.keys).toEqual([{"name": "mode", "optional": false}]);
		expect(Url.match(pattern, '/')).toEqual(null);
		expect(Url.match(pattern, '/foo')).toEqual({mode: 'foo'});
		expect(Url.match(pattern, '/bar/')).toEqual({mode: 'bar'});
		expect(Url.match(pattern, '/baz/')).toEqual(null);
	});


	test('/:page/details/:id?', () => {
		var pattern = '/:page/details/:id?';
		var matcher = Url.toMatcher(pattern);

		expect(matcher.source).toBe('^\\/(?:([^\\/]+))\\/details(?:\\/([^\\/]+))?\\/*$');
		expect(matcher.keys).toEqual([{"name": "page", "optional": false}, {"name": "id", "optional": true}]);
		expect(Url.match(pattern, '/')).toEqual(null);
		expect(Url.match(pattern, '/foo/details/')).toEqual({page: 'foo'});
		expect(Url.match(pattern, '/foo/details/123')).toEqual({page: 'foo', id: '123'});
		expect(Url.match(pattern, '/details/123')).toEqual(null);
	});


	test('/:folder(foo|\\d+)?', () => {
		var pattern = '/:folder(foo|\\d+)?';
		var matcher = Url.toMatcher(pattern);

		expect(matcher.source).toBe('^(?:\\/(foo|\\d+))?\\/*$');
	});

	test('query methods', () => {
		var req = new Url('https://mail.ru/?foo&bar=baz');

		expect(req.query.foo).toBe('');
		expect(req.query.bar).toBe('baz');

		req.addToQuery({qux: 'Y'});
		expect(req.query.qux).toBe('Y');

		req.setQuery('qux=N&zzz');
		expect(req.query.qux).toBe('N');
		expect(req.query.zzz).toBe('');

		req.removeFromQuery('zzz');
		expect(req.query.zzz).toBe(void 0);

		req.removeFromQuery(['foo', 'bar']);
		expect(req.query.zzz).toBe(void 0);

		req.addToQuery({qux: null, 's"t"r': '<%^&>'});
		expect(req + '').toBe('https://mail.ru/?s%22t%22r=%3C%25%5E%26%3E');

		req.setQuery({}, true);
		expect(req + '').toBe('https://mail.ru/');
	});
});
