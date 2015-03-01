define(['url', './urls'], function (URL, urls) {
	module('URL');

	// https://developer.mozilla.org/en-US/docs/Web/API/URLUtils
	var URLUtils = window.URL;


	function url(url) {
		var a = document.createElement('a');
		a.href = url || location.toString();
		return a;
	}


	var cases = [
		null,
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
	cases.forEach(function (x) {
		test('URLUtils: ' + (x || 'without arguments'), function () {
			var actual = new URL(x),
				expected = new URLUtils(x || '')
			;

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				equal(actual[attr], expected[attr], attr);
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
			var actual = new URL(x, 'http://mail.ru/'),
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
			var actual = new URL(x, location),
				expected = url(x)
			;

			'href protocol host hostname port pathname search hash username password'.split(' ').forEach(function (attr) {
				equal(actual[attr], expected[attr], attr);
			});
		});
	});


	// Check urls
	urls.forEach(function (x) {
		test(x, function () {
			equal(new URL(x).href, new URLUtils(x).href, 'URL vs. URLUtils');
			equal(new URL(x, location).href, url(x).href, 'URL vs. <a/>');
		});
	});
});
