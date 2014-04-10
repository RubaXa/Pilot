define(['Pilot', 'vendor/jquery.flickr', 'vendor/pilot.effects'], function (Pilot) {
	/**
	 * Default screen view
	 * @class DefaultView
	 */
	var DefaultView = Pilot.View.extend(/** @lends DefaultView.prototype */{
		/**
		 * Find element by name
		 * @param   {String} name
		 * @returns {jQuery}
		 */
		$$: function (name) {
			return this.$('.js-' + name);
		},

		/**
		 * Set screen title
		 * @param {String} val
		 */
		setTitle: function (val) {
			this.$$('title').text(val);
		},

		/**
		 * Set "back" button url
		 * @param {String} url
		 */
		setBackUrl: function (url) {
			this.$$('back').prop('href', url);
		},

		/**
		 * Set content screen
		 * @param {String} type
		 * @param {String} [val]
		 */
		setHtml: function (type, val) {
			if (!val) {
				val = type;
				type = 'content'; // default type
			}
			this.$$(type).html(val);
		},

		setScrollTop: function (top) {
			this.$$('content').scrollTop(top);
		}
	});

	// Export
	return DefaultView;
});
