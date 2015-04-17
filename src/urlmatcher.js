define(['url'], function (URL) {
	/**
	 * @class URLMatcher
	 */
	var URLMatcher = function () {
		this.pattern = {};
		this.params = {};
		this.query = {};
	};

	URLMatcher.prototype = /** @lends URLMatcher# */{
		constructor: URLMatcher,

		test: function (req) {
			var params = this.regexp.exec(req.pathname);

			if (params) {
			}

			return false;
		}
	};

	return URLMatcher;
});
