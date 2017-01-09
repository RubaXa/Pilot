(function (QUnit) {
	QUnit.config.reorder = false;
	QUnit.config.autostart = false;
	QUnit.testStart(function () {
		if (window.$ && $.mockjax) {
			if (window.wallaby) {
				$.mockjaxSettings.responseTime = 1;
			}
			$.mockjax.clear();
		}
		window.logger && logger.reset();
	});


	window.promiseTest = function (name, callback) {
		QUnit.asyncTest(name, function () {
			var promise = callback.call(this);

			promise.__noLog = true;
			if (promise._promise) {
				promise._promise.__noLog = true;
			}

			promise.then(function () {
				start();
			}, function (err) {

				var details = (!err.isOK && err.error || err[0] || err);

				if (details.isOK && details.get) {
					details = {
						url: details.url,
						error: details.error,
						status: details.status,
						statusText: details.statusText,
						readyState: details.readyState,
						responseText: details.responseText,
						requestData: details.data
					};
				}

				deepEqual(details, '', 'Тест «' + name + '» — fail');
				deepEqual(err.stack, '', 'Стек ошибки');
				start();
			});
		});
	};


	window.testSkip = function() {
		QUnit.test(arguments[0] + ' (SKIPPED)', function() {
			var li = document.getElementById(QUnit.config.current.id);

			QUnit.expect(0);//dont expect any tests

			li && QUnit.done(function() {
				li.style.background = '#FFFF99';
			});
		});
	};


	window.testEnv = function (name, fn) {
		test(name, function (){
			fn();

			var indexOf = Array.prototype.indexOf;
			Array.prototype.indexOf = void 0;

			fn();

			Array.prototype.indexOf = indexOf;
		});
	};


	window.requireTest = function (name, fn) {
		var moduleName = QUnit.config.currentModule;

		moduleName = moduleName.name || moduleName;

		asyncTest(name + ':amd', function (){
			require([moduleName], function (module) {
				fn(module);
				start();
			});
		});


		asyncTest(name + ':module', function (){
			var define = window.define;
			var src = require.toUrl(moduleName+'.js');

			window.define = null;

			jQuery.ajax({ url: src, dataType: 'text' }).always(function (source){
				var module = { 'exports': {} };

				try {
					(new Function('module', source))(module);
				} catch (er){}

				fn(module['exports']);

				window.define = define;
				start();
			});
		});


		asyncTest(name + ':inline', function (){
			var define = window.define;
			var src = require.toUrl(moduleName+'.js');

			window.define = null;
			jQuery.ajax({ url: src, dataType: 'text' }).always(function (source){
				try {
					(new Function(source))();
				} catch (er){}

				if (moduleName === 'Promise') {
					moduleName = 'Deferred';
				}

				fn(window[moduleName]);
				window.define = define;
				start();
			});
		});
	};


	// Проверяем наличие методов
	window.methodExists = function (obj, names) {
		if (obj) {
			var i = 0, n = names.length;
			for (; i < n; i++) {
				equal(typeof obj[names[i]], 'function', names[i] + ' is function');
			}
		} else {
			ok(false, 'obj not object');
			ok(false, names);
		}
	};



	function runSuite(name, args, fn) {
		if (!fn) {
			fn = args;
			args = [];
		}

		runSuite.queue = (runSuite.queue || $.Deferred().resolve()).then(function () {
			var dfd = $.Deferred();
			var suite = (new Bench.Suite);

			fn.apply(suite, [].concat(suite, args));

			suite
				.on('cycle', function (event) {
					console.log(String(event.target));
				})
				.on('complete', function () {
					console.log('Fastest is ' + this.filter('fastest').pluck('name'));
					console.groupEnd();
					dfd.resolve();
				})
				.run({ 'async': true })
			;

			return dfd;
		});
	}



	window.benchTest = function (name, fastest, targets) {
		asyncTest(name, function () {
			console.info('[' + QUnit.config.currentModule.name + '] ' + name);

			var suite = (new Benchmark.Suite);

			for (test in targets) {
				suite.add(test, targets[test]);
			}

			suite.on('cycle', function (evt) {
				ok(true, evt.target);
				console.log(evt.target+'')
			});

			suite.on('complete', function () {
				var name = this.filter('fastest').pluck('name') + '';

				equal(fastest, name, fastest + ' is fastest');
				start();

				setTimeout(function () {
					$('.qunit-assert-list').removeClass('qunit-collapsed');
				}, 100);
			});
			suite.run({ async: true });
		});
	};

})(window.QUnit);
