define(['mithril', 'pilot/mixin/view'], function (/** Mithril */m, view) {
	var _timers = {};

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

			_this.components = Object.keys(components).map(function (name) {
				var component = components[name](_this, name);
				_this[name] = component;
				return component;
			});

			view.apply.apply(_this, arguments);

			_this.router.one('route-end', function () {
				if (_this.el) {
					_this.$apply = function () {
						_timers = {};
						_this.render();
					};

					_this.$apply();

					_this.router.$apply = _this.$apply;
					_this.router.on('route-end', _this.$apply);
				}
			});
		},

		renderComponents: function () {
			return this.components.map(function (component) {
				var time = performance.now();
				var result = component.render();

				_timers[component.displayName] = performance.now() - time;

				return result;
			});
		},

		render: function () {
			var start = performance.now();
			var fragment = this.renderComponents();

			_timers['renderComponents'] = performance.now() - start;

			var time = performance.now();
			m.render(this.el, fragment);

			_timers['mithril.render'] = performance.now() - time;
			_timers['TOTAL'] = performance.now() - start;

			console.table(Object.keys(_timers).reduce(function (table, name) {
				table[name] = {
					'time, ms': _timers[name].toFixed(3)*1
				};

				return table;
			}, {}));
		}
	});
});
