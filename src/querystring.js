define([], function () {
	'use strict';

	var encodeURIComponent = window.encodeURIComponent;
	var decodeURIComponent = window.decodeURIComponent;


	function _stringifyParam(key, val, indexes) {
		/* jshint eqnull:true */
		if (val == null || val === '' || typeof val !== 'object') {
			return encodeURIComponent(key) +
				(indexes ? '[' + indexes.join('][') + ']' : '') +
				(val == null || val === '' ? '' : '=' + encodeURIComponent(val));
		}
		else {
			var pairs = [];

			for (var i in val) {
				if (val.hasOwnProperty(i)) {
					pairs.push(_stringifyParam(key, val[i], (indexes || []).concat(i >= 0 ? '' : encodeURIComponent(i))));
				}
			}

			return pairs.join('&');
		}
	}


	/**
	 * @module Pilot.queryString
	 */
	var queryString = /** @lends queryString */{
		/**
		 * Parse query string
		 * @param   {string} search
		 * @returns {Object}
		 */
		parse: function (search) {
			var query = {};

			if (typeof search === 'string') {
				if (/^[?#]/.test(search)) {
					search = search.substr(1);
				}

				var pairs = search.trim().split('&'),
					i = 0,
					n = pairs.length,
					pair,
					name,
					val;

				for (; i < n; i++) {
					pair = pairs[i].split('=');
					name = pair.shift().replace('[]', '');
					val = pair.join('=');

					if (val === void 0) {
						val = '';
					}
					else {
						try {
							val = decodeURIComponent(val);
						}
						catch (err) {
							val = unescape(val);
						}
					}

					if (name) {
						if (query[name] === void 0) {
							query[name] = val;
						}
						else if (query[name] instanceof Array) {
							query[name].push(val);
						}
						else {
							query[name] = [query[name], val];
						}
					}
				}
			}

			return query;
		},


		/**
		 * Stringify query object
		 * @param   {Object}  query
		 * @returns {string}
		 */
		stringify: function (query) {
			var str = [], key, val;

			if (query && query instanceof Object) {
				for (key in query) {
					if (query.hasOwnProperty(key)) {
						str.push(_stringifyParam(key, query[key]));
					}
				}
			}

			return str.join('&');
		}
	};


	// Export
	return queryString;
});
