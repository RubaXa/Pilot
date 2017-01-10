/**
 * @author RubaXa <trash@rubaxa.org>
 * @license MIT
 */
(function () {
	"use strict";

	var RDASH = /-/g,
		RSPACE = /\s+/,

		r_camelCase = /-(.)/g,
		camelCase = function (_, chr) {
			return chr.toUpperCase();
		},

		hasOwn = ({}).hasOwnProperty,
		emptyArray = []
	;



	/**
	 * Получить список слушателей
	 * @param    {Object}  target
	 * @param    {string}  name
	 * @returns  {Array}
	 * @memberOf Emitter
	 */
	function getListeners(target, name) {
		var list = target.__emList;

		name = name.toLowerCase().replace(RDASH, '');

		if (list === void 0) {
			list = target.__emList = {};
			list[name] = [];
		}
		else if (list[name] === void 0) {
			list[name] = [];
		}

		return list[name];
	}



	/**
	 * Излучатель событий
	 * @class Emitter
	 * @constructs Emitter
	 */
	var Emitter = function () {
	};
	Emitter.fn = Emitter.prototype = /** @lends Emitter# */ {
		constructor: Emitter,


		/**
		 * Прикрепить обработчик для одного или нескольких событий, поддерживается `handleEvent`
		 * @param   {string}    events  одно или несколько событий, разделенных пробелом
		 * @param   {Function}  fn      функция обработчик
		 * @returns {Emitter}
		 */
		on: function (events, fn) {
			events = events.split(RSPACE);

			var n = events.length, list;

			while (n--) {
				list = getListeners(this, events[n]);
				list.push(fn);
			}

			return this;
		},


		/**
		 * Удалить обработчик для одного или нескольких событий
		 * @param   {string}    [events]  одно или несколько событий, разделенных пробелом
		 * @param   {Function}  [fn]      функция обработчик, если не передать, будут отвязаны все обработчики
		 * @returns {Emitter}
		 */
		off: function (events, fn) {
			if (events === void 0) {
				this.__emList = events;
			}
			else {
				events = events.split(RSPACE);

				var n = events.length;

				while (n--) {
					var list = getListeners(this, events[n]), i = list.length, idx = -1;

					if (arguments.length === 1) {
						list.splice(0, 1e5); // dirty hack
					} else {
						if (list.indexOf) {
							idx = list.indexOf(fn);
						} else { // old browsers
							while (i--) {
								/* istanbul ignore else */
								if (list[i] === fn) {
									idx = i;
									break;
								}
							}
						}

						if (idx !== -1) {
							list.splice(idx, 1);
						}
					}
				}
			}

			return this;
		},


		/**
		 * Прикрепить обработчик события, который выполняется единожды
		 * @param   {string}    events  событие или список
		 * @param   {Function}  fn      функция обработчик
		 * @returns {Emitter}
		 */
		one: function (events, fn) {
			var proxy = function () {
				this.off(events, proxy);
				return fn.apply(this, arguments);
			};

			return this.on(events, proxy);
		},


		/**
		 * Распространить событие
		 * @param   {string}  type    тип события
		 * @param   {Array}   [args]  аргумент или массив аргументов
		 * @returns {*}
		 */
		emit: function (type, args) {
			var list = getListeners(this, type),
				i = list.length,
				fn,
				ctx,
				tmp,
				retVal,
				argsLength
			;

			type = 'on' + type.charAt(0).toUpperCase() + type.substr(1);

			if (type.indexOf('-') > -1) {
				type = type.replace(r_camelCase, camelCase);
			}

			if (typeof this[type] === 'function') {
				retVal = this[type].apply(this, [].concat(args));
			}

			if (i > 0) {
				args = args === void 0 ? emptyArray : [].concat(args);
				argsLength = args.length;

				while (i--) {
					fn = list[i];
					ctx = this;

					/* istanbul ignore else */
					if (fn !== void 0) {
						if (fn.handleEvent !== void 0) {
							ctx = fn;
							fn = fn.handleEvent;
						}

						if (argsLength === 0) {
							tmp = fn.call(ctx);
						}
						else if (argsLength === 1) {
							tmp = fn.call(ctx, args[0]);
						}
						else if (argsLength === 2) {
							tmp = fn.call(ctx, args[0], args[1]);
						}
						else {
							tmp = fn.apply(ctx, args);
						}

						if (tmp !== void 0) {
							retVal = tmp;
						}
					}
				}
			}

			return retVal;
		},


		/**
		 * Распространить `Emitter.Event`
		 * @param   {string}  type    тип события
		 * @param   {Array}   [args]  аргумент или массив аргументов
		 * @param   {*}   [details]  детали объекта события
		 * @returns {Emitter}
		 */
		trigger: function (type, args, details) {
			var evt = new Event(type);
			
			evt.target = evt.target || this;
			evt.details = details;
			evt.result = this.emit(type.type || type, [evt].concat(args));

			return this;
		}
	};



	/**
	 * Событие
	 * @class Emitter.Event
	 * @constructs Emitter.Event
	 * @param   {string|Object|Event}  type  тип события
	 * @returns {Emitter.Event}
	 */
	function Event(type) {
		if (type instanceof Event) {
			return type;
		}

		if (type.type) {
			for (var key in type) {
				/* istanbul ignore else */
				if (hasOwn.call(type, key)) {
					this[key] = type[key];
				}
			}

			type = type.type;
		}

		this.type = type.toLowerCase().replace(RDASH, '');
	}

	Event.fn = Event.prototype = /** @lends Emitter.Event# */ {
		constructor: Event,


		/** @type {boolean} */
		defaultPrevented: false,


		/** @type {boolean} */
		propagationStopped: false,


		/**
		 * Позволяет определить, было ли отменено действие по умолчанию
		 * @returns {boolean}
		 */
		isDefaultPrevented: function () {
			return this.defaultPrevented;
		},


		/**
		 * Отменить действие по умолчанию
		 */
		preventDefault: function () {
			this.defaultPrevented = true;
		},


		/**
		 * Остановить продвижение события
		 */
		stopPropagation: function () {
			this.propagationStopped = true;
		},


		/**
		 * Позволяет определить, было ли отменено продвижение события
		 * @return {boolean}
		 */
		isPropagationStopped: function () {
			return this.propagationStopped;
		}
	};


	/**
	 * Подмешать методы к объекту
	 * @static
	 * @memberof Emitter
	 * @param   {Object}  target    цель
	 * @returns {Object}
	 */
	Emitter.apply = function (target) {
		target.on = Emitter.fn.on;
		target.off = Emitter.fn.off;
		target.one = Emitter.fn.one;
		target.emit = Emitter.fn.emit;
		target.trigger = Emitter.fn.trigger;
		return target;
	};


	// Версия модуля
	Emitter.version = "0.3.0";


	// exports
	Emitter.Event = Event;
	Emitter.getListeners = getListeners;


	if (typeof define === "function" && (define.amd || /* istanbul ignore next */ define.ajs)) {
		define('Emitter', [], function () {
			return Emitter;
		});
	} else if (typeof module != "undefined" && module.exports) {
		module.exports = Emitter;
	} else {
		window.Emitter = Emitter;
	}
})();
