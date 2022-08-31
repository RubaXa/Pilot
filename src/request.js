define(['./url', './querystring'], function (/** URL */URL, /** queryString */queryString) {


	/**
	 * @class  Pilot.Request
	 * @constructs Pilot.Request
	 * @param  {string}  url
	 * @param  {string}  [referrer]
	 * @param  {Pilot}   [router]
	 */
	var Request = function (url, referrer, router) {
		url = new URL(url);

		this.href = url.href;
		this.protocol = url.protocol;
		this.host = url.host;
		this.hostname = url.hostname;
		this.port = url.port;

		this.path =
		this.pathname = url.pathname;

		this.search = url.search;
		this.query = queryString.parse(url.search);
		this.params = {};

		this.hash = url.hash;

		this.route = router && (router.route || router.activeRoute) || {};
		this.router = router;
		this.referrer = referrer;
		this.redirectHref = null;

		// Алиас, который сматчился
		this.alias = void 0;
	};


	Request.prototype = /** @lends Request# */{
		constructor: Request,

		clone: function () {
			var req = new Request(this.href, this.referrer, this.router);

			req.query = this.query;
			req.params = this.params;

			return req;
		},

		is: function (id) {
			return !!(this.route && (this.route.id == id));
		},

		redirectTo: function (href, interrupt) {
			this.redirectHref = href;

			if (interrupt) {
				throw new Request(href, this.href, this.router);
			}
		},

		toString: function () {
			return this.href;
		},

		snapshot: function () {
			return Object.create(this, {
				query: {
					value: Object.assign({}, this.query)
				},
				params: {
					value: Object.assign({}, this.params)
				}
			});
		}
	};


	// Export
	return Request;
});
