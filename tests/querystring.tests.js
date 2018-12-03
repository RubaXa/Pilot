/* global describe, beforeEach, test, expect */

const queryString = require('../src/querystring');

describe('queryString', () => {

	// Parser
	test('parse', () => {
		var cases = {
			'?foo=bar': {foo: 'bar'},
			'#foo=bar': {foo: 'bar'},
			'foo=bar': {foo: 'bar'},
			'foo=bar&key=val': {foo: 'bar', key: 'val'},
			'foo': {foo: ''},
			'foo&key': {foo: '', key: ''},
			'foo=bar&key': {foo: 'bar', key: ''},
			'?': {},
			'#': {},
			' ': {},
			'foo=bar&foo=baz': {foo: ['bar', 'baz']},
			'foo[]=bar&foo[]=baz': {foo: ['bar', 'baz']}
			//'foo[bar]=1&foo[baz]=1': {foo: {bar:1, baz: 1}},
			//'foo=bar=baz': { foo: 'bar=baz' }
		};


		Object.keys(cases).forEach(function (search) {
			expect(queryString.parse(search)).toEqual(cases[search]);
		});
	});


	// Stringify
	test('stringify', () => {
		var cases = {
			'null': {'null':null},
			'undefined': {'undefined':void 0},
			'empty': {empty: ''},
			'foo=bar': {foo: 'bar'},
			'foo=bar&key=val': {foo: 'bar', key: 'val'},
			'foo&key': {foo: '', key: ''},
			'foo=bar&key': {foo: 'bar', key: ''},
			'foo=bar%3Dbaz': {foo: 'bar=baz'},
			'id[]=1&id[]=2': {id: [1, 2]},
			'id[foo]=1&id[bar]=2': {id: {foo:1, bar:2}},
			'id[foo][bar]=2': {id: {foo: {bar:2}}},
			'id[][bar][]=1': {id: [{bar:[1]}]}
		};


		Object.keys(cases).forEach(function (query) {
			expect(queryString.stringify(cases[query])).toEqual(query);
		});
	});
});
