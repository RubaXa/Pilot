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
	var queryStringNew = /** @lends queryString */{
		/**
		 * Parse query string
		 * @param   {string} search
		 * @returns {Object}
		 */
		parse: function (search) {
			if (/^[?#]/.test(search)) {
				search = search.substr(1);
			}

			search = search.trim();

			const entries = Array.from(new URLSearchParams(search).entries()).map(function (entry) {
				const k = entry[0];
				const v = entry[1];

				return [k.replace('[]', ''), v];
			});

			const aggr = {};

			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				const k = entry[0];
				const v = entry[1];

				if (!aggr[k]) {
					aggr[k] = v;
					continue;
				}

				if (Array.isArray(aggr[k])) {
					aggr[k].push(v);
					continue;
				}

				aggr[k] = [aggr[k], v];
			}

			return aggr;
		},


		/**
		 * Stringify query object
		 * @param   {Object}  query
		 * @returns {string}
		 */
		stringify: function (query) {
			if (!query || !(query instanceof Object)) {
				return '';
			}

			const objectParams = [];
			const params = new URLSearchParams();
			Object.entries(query).forEach(function (entry) {
				const k = entry[0];
				const v = entry[1];

				if (typeof v !== 'string') {
					objectParams.push(_stringifyParam(k, v));
				} else {
					params.append(k, v);
				}
			});

			if (objectParams.length === 0) {
				return params.toString();
			}

			return [params.toString(), objectParams.join('&')].filter(Boolean).join('&');
		}
	};

	/**
	 * @module Pilot.queryString
	 */
	var queryStringOld = /** @lends queryString */{
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

	var hasUrlSearchParams = !!window.URLSearchParams;

	var queryString = hasUrlSearchParams ? queryStringNew : queryStringOld;

	// Export
	return Object.assign(queryString, {'new': queryStringNew, 'old': queryStringOld});
});
