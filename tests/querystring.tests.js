/* global describe, beforeEach, test, expect */

['new', 'old'].forEach(type => {

	describe(`queryString: ${type}`, () => {
		const queryString = require('../src/querystring')[type];

		// Parser
		const casesParse = {
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
			'foo[]=bar&foo[]=baz': {foo: ['bar', 'baz']},
			// 'test=1+2': {test: '1 2'}
			// 'foo[bar]=1&foo[baz]=1': {foo: {bar:1, baz: 1}},
			//'foo=bar=baz': { foo: 'bar=baz' }
		};


		Object.keys(casesParse).forEach(function (search) {
			test(`parse ${search}`, () => {
				expect(queryString.parse(search)).toEqual(casesParse[search]);
			});
		});


		// Stringify
		const casesStringify = {
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

		// Полностью эквивалентно по спеке URL, теряется при сериализации
		const optionalReplacements = {
			'foo=bar&key': 'foo=bar&key=',
			'foo&key': 'foo=&key=',
			'empty': 'empty='
		}


		Object.keys(casesStringify).forEach(function (query) {
			const data = casesStringify[query];

			test(`stringify ${JSON.stringify(data)}`, () => {
				expect([query, optionalReplacements[query]].filter(a => a !== undefined)).toContain(queryString.stringify(data));
			});
		});

		const identityTestCases = [
			'',
			'test=1+2'
		];

		if (type === 'old') {
			return;
		}

		identityTestCases.forEach(function (query) {
			test(`identity of query ${query}`, () => {
				expect(queryString.stringify(queryString.parse(query))).toEqual(query);
			});
		});
	});
})

