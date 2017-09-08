QUnit.module('Pilot.bench');

function benchRoute(name, Class) {
	QUnit.asyncTest(name, function (assert) {
		var max = 1e3, // кол-во итерация
			maxOpts = 30, // кол-во опций
			ts,
			i, j,
			log,
			options = [],
			elements = [],
			lap = function (prefix) {
				var delta = performance.now() - ts;

				log = prefix + ' (x' + max + '): ';
				log += (new Array(40 - log.length)).join(' ');
				log += (delta / max).toFixed(4) + 'ms, total: ' + delta.toFixed(4) + 'ms';

				assert.ok(true, log);
				console.info(log);
				ts = performance.now();
			},
			Route = Class,

			RouteWithoutEvents = Class.extend({
				__withoutEvents__: true
			}),
			RouteWithoutRouteEvents = RouteWithoutEvents.extend({
				__onRouteEvents__: false
			}),

			RouteWithEmitter = RouteWithoutEvents.extend({}),
			RouteWithoutRouteEventsWithEmitter = RouteWithoutEvents.extend({
				__onRouteEvents__: false
			})
		;

		__Emitter.apply(RouteWithEmitter.fn);
		__Emitter.apply(RouteWithoutRouteEventsWithEmitter.fn);

		console.group(name);


		// Lap: elements
		ts = performance.now();
		for (i = 0; i < max; i++) {
			elements[i] = document.createElement('div');
		}
		lap('Generate elements');

		// Lap: options
		ts = performance.now();
		for (i = 0; i < max; i++) {
			j = maxOpts;
			options[i] = {
				el: elements[i]
			};
			while (j--) {
				options[i][(Math.random()*1e6).toString(36)] = (Math.random()*1e6).toString(36);
			}
		}
		lap('Generate options');

		// Lap: new
		for (i = 0; i < max; i++) {
			new Pilot.Route();
		}
		lap('Without options');

		// Lap: new + options
		for (i = 0; i < max; i++) {
			new Route(options[i]);
		}
		lap('With ' + maxOpts +  ' options');

		// Lap: new - jq
		for (i = 0; i < max; i++) {
			new RouteWithoutEvents();
		}
		lap('Without jQEvents');

		// Lap: new - jq + options
		for (i = 0; i < max; i++) {
			new RouteWithoutEvents(options[i]);
		}
		lap('Without jQEvents + options');

		// Lap: new - jq + options
		for (i = 0; i < max; i++) {
			new RouteWithoutRouteEvents(options[i]);
		}
		lap('Without jQEvents + options, II');

		// Lap: new + Emitter
		for (i = 0; i < max; i++) {
			new RouteWithEmitter();
		}
		lap('With Emitter');

		// Lap: new - jq + options
		for (i = 0; i < max; i++) {
			new RouteWithEmitter(options[i]);
		}
		lap('With Emitter + options');

		// Lap: new - jq + options
		for (i = 0; i < max; i++) {
			new RouteWithoutRouteEventsWithEmitter(options[i]);
		}
		lap('With Emitter + options, II');

		console.groupEnd(name);
		start();
	});
}


benchRoute('Route', Pilot.Route);
benchRoute('View', Pilot.View);


QUnit.asyncTest('jQuery vs. Alternative', function (assert) {
	var done = assert.async();
	var bench = function (type) {
		var dfd = $.Deferred();
		var $iframe = $('<iframe src="./bench.html?' + type + '"/>');

		window['__bench'+type] = dfd.resolve;

		$(function (){
			$iframe.appendTo('body');
		});

		return	dfd;
	};


	// Тестируем
	$.when(bench('native'), bench('jquery')).always(function (nts, $ts) {
		assert.ok(nts, 'Native: ' + nts + 'ms');
		assert.ok($ts, 'jQuery: ' + $ts + 'ms');
		assert.ok($ts / nts > 1.5, 'jQuery / Native: ' + ($ts / nts));

		done();
	});
});
