/**
 * @author RubaXa <trash@rubaxa.org>
 * @license MIT
 */
(function () {
	"use strict";

	var
		RSPACE = /\s+/,

		hasOwn = ({}).hasOwnProperty,

		returnTrue = function () {
			return true;
		}
	;


	/**
	 * Retrieve list of listeners
	 * @param   {Object}  target
	 * @param   {String}  name
	 * @returns {Array}
	 */
	function getListeners(target, name) {
		var list = target.__emList;

		name = name.toLowerCase();

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
	 * @class Event
	 * @param {String|Object|Event} type
	 * @constructor
	 */
	function Event(type) {
		if (type instanceof Event) {
			return type;
		}

		if (type.type) {
			for (var key in type) {
				if (hasOwn.call(type, key)) {
					this[key] = type[key];
				}
			}

			type = type.type;
		}

		this.type = type.toLowerCase();
	}

	Event.fn = Event.prototype = {
		constructor: Event,

		isDefaultPrevented: function () {
			return false;
		},

		preventDefault: function () {
			this.isDefaultPrevented = returnTrue;
		}
	};


	/**
	 * @class Emitter
	 * @constructor
	 */
	var Emitter = function () {
	};
	Emitter.fn = Emitter.prototype = {
		__lego: Emitter,
		constructor: Emitter,


		/**
		 * Attach an event handler function for one or more events.
		 * @param   {String}    events  One or more space-separated event types.
		 * @param   {Function}  fn      A function to execute when the event is triggered.
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
		 * Remove an event handler.
		 * @param   {String}    [events]  One or more space-separated event types.
		 * @param   {Function}  [fn]      A handler function previously attached for the event(s).
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
		 * Attach a handler. The handler is executed at most once.
		 * @param   {String}    events  One or more space-separated event types.
		 * @param   {Function}  fn      A function to execute at the time the event is triggered.
		 * @returns {Emitter}
		 */
		one: function (events, fn) {
			return this.on(events, function __() {
				this.off(events, __);
				return fn.apply(this, arguments);
			});
		},


		/**
		 * Execute all handlers attached to an element for an event
		 * @param   {String}  type    One event types
		 * @param   {Array}   [args]  An array of parameters to pass along to the event handler.
		 * @returns {*}
		 */
		emit: function (type, args) {
			var list = getListeners(this, type),
				i = list.length,
				fn,
				ctx,
				retVal
			;

			type = 'on' + type.charAt(0).toUpperCase() + type.substr(1);

			if (typeof this[type] === 'function') {
				retVal = this[type].apply(this, [].concat(args));
			}

			if (i > 0) {
				args = [].concat(args);

				while (i--) {
					fn = list[i];
					ctx = this;

					if (fn.handleEvent !== void 0) {
						ctx = fn;
						fn = fn.handleEvent;
					}

					retVal = fn.apply(ctx, args);
				}
			}

			return retVal;
		},


		/**
		 * Execute all handlers attached to an element for an event
		 * @param   {String}  type    One event types
		 * @param   {Array}   [args]  An array of additional parameters to pass along to the event handler.
		 * @returns {Emitter}
		 */
		trigger: function (type, args) {
			var evt = new Event(type);
			evt.target = evt.target || this;
			evt.result = this.emit(evt.type, [evt].concat(args));
			return this;
		}
	};


	/**
	 * Apply to object
	 * @param  {Object}  target
	 */
	Emitter.apply = function (target) {
		target.on = Emitter.fn.on;
		target.off = Emitter.fn.off;
		target.one = Emitter.fn.one;
		target.emit = Emitter.fn.emit;
		target.trigger = Emitter.fn.trigger;
		return    target;
	};


	// exports
	Emitter.Event = Event;
	Emitter.getListeners = getListeners;

	if (typeof define === "function" && define.amd) {
		define(function () {
			return Emitter;
		});
	} else if (typeof module != "undefined" && module.exports) {
		module.exports = Emitter;
	} else {
		window.Emitter = Emitter;
	}
})();
