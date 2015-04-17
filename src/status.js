define([], function () {
	/**
	 * @class Pilot.Status
	 * @constructs  Pilot.Status
	 * @param  {number} code
	 * @param  {*} details
	 */
	var Status = function (code, details) {
		this.code = code;
		this.details = details;
	};


	Status.prototype = /** @lends Pilot.Status */{
		constructor: Status,

		toJSON: function () {
			return {code: this.code, details: this.details};
		}
	};


	/**
	 * Преобразовать в статус
	 * @methodOf Pilot.Status
	 * @param {*} value
	 * @return {Pilot.Status}
	 */
	Status.from = function (value) {
		if (value.status) {
			value = new Status(value.status, value);
		}
		else if (!value || !value.code) {
			value = new Status(500, value);
		}

		return value;
	};


	// Export
	return Status;
});
