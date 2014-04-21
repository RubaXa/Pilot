/*! $.ajaxCache | RubaXa <trash@rubaxa.org> | MIT */
define(['jquery'], function ($) {
	var _cache = {};

	/**
	 * Convert ajax-options to cache key
	 * @param   {Object}  options
	 * @returns {String}
	 */
	function _cacheKey(options) {
		return options.url + $.param(options.data || {});
	}


	/**
	 * Get cache storage
	 * @param {String} [name]
	 * @returns {Function}
	 */
	$.ajaxCache = function (name) {
		return _cache[name] || (_cache[name] = function (name, value) {
			return value == null
				? this[name] // get
				: (this[name] = value) // set
			;
		});
	};


	$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
		var
			cache = options.cache
			, key = _cacheKey(originalOptions)
			, xhr
			;

		if (cache && (typeof cache === 'function')) {
			xhr = cache(key); // try get cache

			if (xhr) {
				options.global = false;
				$.extend(jqXHR, xhr);
			} else {
				// set cache
				cache(key, jqXHR.done(function (result) {
					jqXHR.result = result;
				}));
			}
		}

		return    xhr && 'cache';
	});


	$.ajaxTransport('cache', function () {
		return    {
			send: function (headers, callback) {
				callback(200, "OK");
			}
		};
	});
});
