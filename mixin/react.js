define(['react', 'pilot/mixin/view'], function (/** React */React, view) {
	// Export
	return  Object.keys(view).reduce(function (target, name) {
		target[name] = target[name] || view[name];
		return target;
	}, {
		// React mixin
		components: {},

		apply: function () {
			var _this = this;
			var components = _this.components;

			Object.keys(components).map(function (name) {
				components[name] = components[name](_this, name);
			});

			view.apply.apply(_this, arguments);

			if (_this.el) {
				_this.one('before-init', function () {
					Object.keys(components).map(function (name) {
						React.render(components[name], _this.el);
					});
				});
			}
		},

		renderComponents: function () {
			return React.addons.createFragment(this.components);
		}
	});
});
