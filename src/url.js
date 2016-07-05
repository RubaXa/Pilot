/**
 * URL module
 * Base on http://jsperf.com/url-parsing/26
 */

define(['./querystring'], function (/** queryString */queryString) {
	'use strict';

	var parseQueryString = queryString.parse;
	var stringifyQueryString = queryString.stringify;
	var encodeURIComponent = window.encodeURIComponent;


	/**
	 * URL Parser
	 * @type {RegExp}
	 * @const
	 */
	var R_URL_PARSER = /^(((([^:\/#\?]+:)?(?:(\/\/)((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?\]\[]+|\[[^\/\]@#?]+\])(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/;


	/**
	 * Protocol checker
	 * @type {RegExp}
	 * @const
	 */
	var R_PROTOCOL = /^[a-z]+:/;


	/**
	 * Protocol separator
	 * @type {string}
	 * @const
	 */
	var DOUBLE_SLASH = '//';


	/**
	 * @class Url
	 * @constructs Url
	 * @param {string}  url
	 * @param {string|Url|location}  [base]
	 */
	function Url(url, base) {
		if (base === void 0) {
			base = location;
		} else if (typeof base === 'string') {
			base = new Url(base);
		}


		/* jshint eqnull:true */
		if (url == null) {
			url = base.toString();
		}
		else  if (!R_PROTOCOL.test(url)) {
			var protocol = base.protocol,
				host = base.host,
				pathname = base.pathname;

			if (url.charAt(0) === '#') {
				url = base.toString().split('#')[0] + url;
			}
			else if (url.substr(0, 2) === DOUBLE_SLASH) {
				// without protocol
				url = protocol + url;
			}
			else  if (url.charAt(0) === '/') {
				// absolute path
				url = protocol + DOUBLE_SLASH + host + url;
			}
			else {
				// relative path
				url = protocol + DOUBLE_SLASH + host + pathname.substr(0, pathname.lastIndexOf('/') + 1) + url;
			}
		}

		// todo: support punycode
		var matches = R_URL_PARSER.exec(url);

		this.protocol = matches[4] || '';
		this.protocolSeparator = matches[5] || '';

		this.credhost = matches[6] || '';
		this.cred = matches[7] || '';

		this.username = matches[8] || '';
		this.password = matches[9] || '';

		this.host = matches[10] || '';
		this.hostname = matches[11] || '';
		this.port = matches[12] || '';
		this.origin = this.protocol + this.protocolSeparator + this.hostname;

		this.path =
		this.pathname = matches[13] || '/';

		this.segment1 = matches[14] || '';
		this.segment2 = matches[15] || '';

		this.search = matches[16] || '';
		this.query = parseQueryString(this.search);
		this.params = {};

		this.hash = matches[17] || '';

		this.update();
	}


	Url.fn = Url.prototype = /** @lends Url# */{
		constructor: Url,

		/**
		 * Set query params
		 * @param   {object}  query
		 * @param   {array}   [remove]   if `true`, clear the current `query` and set new
		 * @returns {Url}
		 */
		setQuery: function (query, remove) {
			var currentQuery = this.query;

			if (typeof query === 'string'){
				query = parseQueryString(query);
			}

			if (remove === true) {
				this.query = query;
			}
			else {
				if (query != null) {
					for (var key in query) {
						if (query.hasOwnProperty(key)) {
							if (query[key] == null) {
								delete currentQuery[key];
							} else {
								currentQuery[key] = query[key];
							}
						}
					}
				}

				if (remove) {
					if (!(remove instanceof Array)) {
						remove = [remove];
					}

					remove.forEach(function (name) {
						delete currentQuery[name];
					});
				}
			}

			return this.update();
		},


		/**
		 * Add query params
		 * @param   {object} query
		 * @returns {Url}
		 */
		addToQuery: function (query) {
			return this.setQuery(query);
		},


		/**
		 * Remove query params
		 * @param   {string|array}  query
		 * @returns {Url}
		 */
		removeFromQuery: function (query) {
			return this.setQuery(void 0, query);
		},


		/** @returns {Url} */
		update: function () {
			var search = [];

			for (var key in this.query) {
				var value = this.query[key];
				search.push(encodeURI(key) + (value != '' ? '=' + encodeURIComponent(value) : ''));
			}

			this.search = search.length ? '?' + search.join('&') : '';

			this.url = this.href = (
				this.protocol + this.protocolSeparator +
				(this.username ? encodeURIComponent(this.username) + (this.password ? ':' + encodeURIComponent(this.password) : '') + '@' : '') +
				this.host + this.pathname + this.search + this.hash
			);

			return this;
		},


		toString: function () {
			return this.url;
		}
	};


	/**
	 * Parse URL
	 * @static
	 * @param   {string} url
	 * @returns {Url}
	 */
	Url.parse = function (url) {
		return new Url(url);
	};


	/**
	 * Parse query string
	 * @method  Url.parseQueryString
	 * @param   {string} str
	 * @returns {Object}
	 */
	Url.parseQueryString = queryString.parse;


	/**
	 * Stringify query object
	 * @method  Url.parseQueryString
	 * @param   {Object} query
	 * @returns {string}
	 */
	Url.stringifyQueryString = stringifyQueryString;


	/**
	 * Конвертация описания пути в регулярное выражение
	 * @param  {string|RegExp}  pattern
	 * @return {RegExp}
	 */
	Url.toMatcher = function (pattern) {
		// https://github.com/visionmedia/express/blob/master/lib/utils.js#L248
		if (pattern instanceof RegExp) {
			return pattern;
		}

		if (Array.isArray(pattern)) {
			pattern = '(' + pattern.join('|') + ')';
		}

		var keys = [];

		pattern = pattern
			.concat('/*')
			.replace(/\/+/g, '/')
			//.replace(/(\/\(|\(\/)/g, '(?:/')
			.replace(/\(([^\?])/g, '(?:$1')
			.replace(/(\/)?(\.)?:(\w+)(?:(\([^)]+\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
				keys.push({
					name: key,
					optional: !!optional
				});

				slash = slash || '';

				return '' +
					(optional ? '' : slash) +
					'(?:' +
					(optional ? slash : '') +
					(format || '') + (capture || (format && '([^/.]+)' || '([^/]+)')).replace('(?:', '(') + ')' +
					(optional || '') +
					(star ? '(/*)?' : '')
				;
			})
			.replace(/([\/.])/g, '\\$1')
		;

		pattern = new RegExp('^' + pattern + '$', 'i');
		pattern.keys = keys;

		return pattern;
	};


	/**
	 * Вытащить параметры из url
	 * @param   {string}      pattern
	 * @param   {string|Url}  [url]
	 * @returns {Object|null}
	 */
	Url.match = function (pattern, url) {
		var i, n,
			value,
			params = {},
			matches;

		url = Url.parse(url);
		pattern = Url.toMatcher(pattern);
		matches = pattern.exec(url.path);

		if (matches) {
			for (i = 1, n = matches.length; i < n; i++) {
				value = matches[i];

				if (value !== void 0) {
					params[pattern.keys[i - 1].name] = value;
				}
			}

			return params;
		}

		return null;
	};


	// Export
	return Url;
});
