define(['xtpl', 'pilot/mixin/view'], function (/** xtpl */xtpl, view) {
	// Export
	return  Object.keys(view).reduce(function (target, name) {
		target[name] = target[name] || view[name];
		return target;
	}, {
		// xtpl mixin
		template: null,
		components: {},

		apply: function () {
			var _this = this;

			// todo: Нужно что-то с этим сделать
			xtpl.mod('routeUrl', function (id, params) {
				return _this.router.getUrl(id, params)
			});


			view.apply.apply(_this, arguments);

			_this.one('before-init', function () {
				var template = _this.template && _this.template.replace(/\sx-route:\s*["'](.*?)['"]/g, function (_, id) {
					var view,
						ctxPath;

					id = id.split(':');

					if (id[0] === '#') {
						id[0] = '#__root__';
					}

					view = _this.router[id[0]];
					ctxPath = 'router["' + id[0] + '"]';

					if (id[1]) {
						view = view.regions[id[1]];
						ctxPath += '.regions["' + id[1] + '"]';
					}

					return view && view.toXBlock ? view.toXBlock(ctxPath) : '';
				});

				_this.router.one('route-end', function () {
					if (_this.el) {
						//console.log(template)
						xtpl.bind(_this.el, template, _this);

						_this.router.$apply = _this.$apply;
						_this.router.on('route-end', _this.$apply);
					}
				});
			});
		},


		toXBlock: function (ctxPath) {
			var _this = this;
			var blocks = Object.keys(this.components).map(function (name) {
				var block = _this.components[name];

				_this[name] = block;
				block.$apply = function () {
					_this.router.$apply();
				};

				return 'scope ctx["' + name + '"] {  `ctx.init();` ' + block.template + ' }';
			});

			return 'scope ctx.' + ctxPath + ' { ' + blocks.join('\n') + ' }';
		}
	});
});
