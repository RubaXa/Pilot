define(['jquery'], function ($) {
	/** @type {window} */
	var win = window;

	/** @type {HTMLDocument} */
	var document = win.document;


	/** @type {HTMLElement} */
	var helper = document.createElement('div');


	// Export
	return {
		/** @type {string} */
		el: '',

		/** @type {jQuery} */
		$el: null,

		/** @type {string} */
		dom: '',

		/** @type {HTMLElement} */
		parentEl: null,

		// Применение примиси
		apply: function () {
			if (this.dom) { // Строим DOM из строки
				helper.innerHTML = this.dom;
				this.el = helper.firstElementChild || helper.firstChild;

				helper.removeChild(this.el);
			}
			else if (typeof this.el == 'string') {
				this.el = document.getElementById(this.el.replace(/^#/, ''));
			}

			this.$el = $(this.el);

			// А теперь добавляем в DOM, если это не так
			if (this.el && this.el.nodeType > 0) {
				this._toggleView(false);

				this.one('before-init', function () {
					// Поиск родителя
					if (this.parentEl === null) {
						var parentRoute = this.parentRoute;

						if (parentRoute) {
							do {
								this.parentEl = (
									parentRoute.el &&
									parentRoute.$el.find('[data-view-id="' + (this.name || this.id).replace(/^#/, '') + '"]')[0] ||
									0 && parentRoute.el
								);
							}
							while (!this.parentEl && (parentRoute = parentRoute.parentRoute));
						} else {
							this.parentEl = document.body;
						}
					}

					//if (this.parentEl && this.parentEl !== this.el) {
					//	this.parentEl.appendChild(this.el);
					//}
				}.bind(this));
			}

			this.on('route-start route-end', function (evt) {
				this._toggleView(evt.type == 'routestart');
			}.bind(this));
		},

		_toggleView: function (state) {
			if (this.router) {
				this.el && this.el.style && (this.el.style.display = state ? '' : 'none');
			}
		},

		$: function (selector) {
			return this.$el.find(selector);
		}
	};
});
