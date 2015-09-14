define(['cito', 'pilot/mixin/view'], function (/** cito */cito, view) {
	var _timers = {};

	// Export
	return  Object.keys(view).reduce(function (target, name) {
		target[name] = target[name] || view[name];
		return target;
	}, {
		// cito mixin
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
			var fragment = {tag:'div', key: 'root', children: this.renderComponents()};

			_timers['renderComponents'] = performance.now() - start;

			var time = performance.now();

			if (this._vdom) {
				cito.vdom.update(this._vdom, fragment);
			}
			else {
				this._vdom = cito.vdom.append(this.el, fragment);
			}

			_timers['cito.vdom'] = performance.now() - time;
			_timers['TOTAL'] = performance.now() - start;

			console.table(Object.keys(_timers).reduce(function (table, name) {
				table[name] = {
					'time, ms': _timers[name].toFixed(3) * 1
				};

				return table;
			}, {}));
		}
	});
});
