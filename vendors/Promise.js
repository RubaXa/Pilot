/**
 * @author RubaXa <trash@rubaxa.org>
 * @license MIT
 */
(function () {
	"use strict";


	function noop() {
	}


	function _then(promise, method, callback) {
		return function () {
			var args = arguments;

			if (typeof callback === 'function') {
				var retVal = callback.apply(promise, args);
				if (retVal && typeof retVal.then === 'function') {
					retVal.done(promise.resolve).fail(promise.reject);
					return;
				} else {
					args = [retVal];
				}
			}

			promise[method].apply(promise, args);
		};
	}


	/**
	 * Fastest Promises.
	 *
	 * @class    Promise
	 * @param   {Function}  [callback]
	 * @returns {Promise}
	 */
	var Promise = function (callback) {
		function _setState(state) {
			return function () {
				_args = arguments;

				dfd.done =
				dfd.fail =
				dfd.resolve =
				dfd.reject = function () {
					return dfd;
				};

				dfd[state ? 'done' : 'fail'] = function (fn) {
					if (typeof fn === 'function') {
						fn.apply(dfd, _args);
					}
					return dfd;
				};

				dfd.catch = dfd.fail;

				var fn,
					fns = state ? _doneFn : _failFn,
					i = 0,
					n = fns.length
				;

				for (; i < n; i++) {
					fn = fns[i];
					if (typeof fn === 'function') {
						fn.apply(dfd, _args);
					}
				}

				fns = _doneFn = _failFn = null;

				return dfd;
			};
		}

		var
			_args,
			_doneFn = [],
			_failFn = [],

			dfd = {
				done: function (fn) {
					_doneFn.push(fn);
					return dfd;
				},

				fail: function (fn) {
					_failFn.push(fn);
					return dfd;
				},

				then: function (doneFn, failFn) {
					var promise = Promise();

					dfd
						.done(_then(promise, 'resolve', doneFn))
						.fail(_then(promise, 'reject', failFn))
					;

					return promise;
				},

				notify: noop, // jQuery support
				progress: noop, // jQuery support
				promise: function () {
					// jQuery support
					return dfd;
				},

				always: function (fn) {
					return dfd.done(fn).fail(fn);
				},

				resolve: _setState(true),
				reject: _setState(false)
			}
		;


		// Like Native
		dfd.catch = dfd.fail;


		// Работеам как native Promises
		if (typeof callback === 'function') {
			callback(dfd.resolve, dfd.reject);
		}

		return dfd;
	};


	/**
	 * Дождаться «разрешения» всех обещаний
	 * @param {Array} iterable
	 * @returns {Promise}
	 */
	Promise.all = function (iterable) {
		var dfd = Promise(),
			d,
			i = 0,
			n = iterable.length,
			remain = n,
			values = [],
			_doneFn = function (val) {
				values.push(val);

				if (--remain <= 0) {
					dfd.resolve(values);
				}
			}
		;

		if (remain === 0) {
			_doneFn();
		}
		else {
			for (; i < n; i++) {
				d = iterable[i];

				if (d && typeof d.then === 'function') {
					if (d.done && d.fail) {
						d.done(_doneFn).fail(dfd.reject);
					} else {
						d.then(_doneFn, dfd.reject);
					}
				}
				else {
					_doneFn(d);
				}
			}
		}

		return dfd;
	};


	/**
	 * Дождаться «разрешения» всех обещаний и вернуть результат последнего
	 * @param   {Array} iterable
	 * @returns {Promise}
	 */
	Promise.race = function (iterable) {
		return Promise.all(iterable).then(function (values) {
			return values.pop();
		});
	};


	/**
	 * Привести значение к «Общеанию»
	 * @param   {*} value
	 * @returns {Promise}
	 */
	Promise.cast = function (value) {
		var promise = Promise();
		return value && typeof value.then === 'function'
			? promise.then(function () { return value; })
			: promise.resolve(value)
		;
	};


	/**
	 * Вернуть «разрешенное» обещание
	 * @param   {*} val
	 * @returns {Promise}
	 */
	Promise.resolve = function (val) {
		return Promise().resolve(val);
	};


	/**
	 * Вернуть «отклоненное» обещание
	 * @param   {*} val
	 * @returns {Promise}
	 */
	Promise.reject = function (val) {
		return Promise().reject(val);
	};


	// exports
	if (typeof define === "function" && define.amd) {
		define(function () {
			return Promise;
		});
	} else if (typeof module != "undefined" && module.exports) {
		module.exports = Promise;
	}
	else {
		window.Deferred = Promise;
		if (!window.Promise) {
			window.Promise = Promise;
		}
	}
})();
