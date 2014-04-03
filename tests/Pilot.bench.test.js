asyncTest('bench', function (){
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
		ok(nts, 'Native: ' + nts + 'ms');
		ok($ts, 'jQuery: ' + $ts + 'ms');
		ok($ts / nts > 1.5, 'jQuery / Native: ' + ($ts / nts));

		start();
	});
});
