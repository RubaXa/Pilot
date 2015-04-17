define([], function () {
	// Export
	return {
		cast: function (list) {
			var matches = {},
				match = list;

			if (typeof list !== 'function') {
				if (list === true || list === void 0) {
					match = function () {
						return true;
					};
				}
				else {
					list.forEach(function (key) {
						matches[key] = true;
					});

					match = function (key) {
						return matches[key];
					};
				}
			}

			return match;
		}
	};
});
