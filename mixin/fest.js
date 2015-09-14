define(['pilot/mixin/view'], function (view) {
	// Export
	return Object.keys(view).reduce(function (target, name) {
		target[name] = target[name] || view[name];
		return target;
	}, {
		// Fest mixin

		components: {},

		apply: function () {
			var pid,
				_this = this;

			_this.dom = '<div></div>';

			// Родительская DOM-примись
			view.apply.apply(this, arguments);

			// todo: нужно переделывать
			document.body.appendChild(_this.el);

			// Биндинг компонентов к DOM
			Object.keys(_this.components).forEach(function (name) {
				var el = document.createElement('span');

				_this[name] = _this.components[name];

				_this[name].route = _this;
				_this[name].bind(el);

				_this.el.appendChild(el);
			});

			_this.on('route', function () {
				clearTimeout(pid);
				pid = setTimeout(function () {
					Object.keys(_this.components).forEach(function (name) {
						_this[name].$apply();
					});
				}, 1);
			});
		},


		$: function (selector) {
			return this.components[selector] || view.$.call(this, selector);
		}
	});
});
