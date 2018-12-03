define(['Emitter'], function(Emitter) {

	function ActionQueue() {
		Emitter.apply(this);

		this._queue = [];
		this._activeIds = {};
		this._id = 0;
		this._lastQueueItem = void 0;
		this._endedCount = -1;
	}

	ActionQueue.PRIORITY_HIGH = 1;
	ActionQueue.PRIORITY_LOW = 0;

	ActionQueue.prototype = {
		constructor: ActionQueue,

		push: function(request, action) {
			// TODO: arg types check

			// Проставляем по умолчанию наивысший приоритет
			if (action.priority == null) {
				action.priority = ActionQueue.PRIORITY_HIGH;
			}

			var queueItem = {
				request: request,
				action: action,
				timestamp: Date.now(),
				id: this._id++
			};

			// Добавляем в очередь
			this._queue.push(queueItem);
			// Возвращаем уникальный id
			return queueItem.id;
		},

		remove: function(id) {
			// Если query был в _activeIds
			if (this._activeIds[id]) {
				// Сбросим _lastQueueItem
				if (this._lastQueueItem === this._activeIds[id]) {
					this._lastQueueItem = void 0;
				}

				// Сообщим, что прекратили выполнять этот экшн
				this.notifyEnd(id, void 0);
				return;
			}

			var nextQueue = [];

			// Формируем новую очередь без экшна с указанным id
			for (var i = 0; i < this._queue.length; i++) {
				if (this._queue[i].id !== id) {
					nextQueue.push(this._queue[i]);
				}
			}

			// Сохраним новую очередь
			this._queue = nextQueue;
			// Сообщим, что прекратили выполнять этот экшн
			this.notifyEnd(id, void 0);
		},

		canPoll: function() {
			var nextItem = this._queue[0];
			var lastActiveItem = this._lastQueueItem;

			// Не можем поллить, так как очередь пуста
			if (!nextItem) {
				return false;
			}

			// Можем поллить, так как ничего не запущено
			if (!lastActiveItem) {
				return true;
			}

			// Можем поллить, если приоритет последнего запущенного экшна равен приоритету следующего экшна в очереди
			return lastActiveItem.action.priority === nextItem.action.priority;
		},

		poll: function() {
			var queueItem = this._queue.shift();

			this._activeIds[queueItem.id] = queueItem;
			this._lastQueueItem = queueItem;

			return queueItem;
		},

		notifyEnd: function(id, result) {
			// Сбрасываем lastQueueItem, если закончили именно его
			if (this._lastQueueItem === this._activeIds[id]) {
				this._lastQueueItem = void 0;
			}

			// Удаляем из активных в любом случае
			delete this._activeIds[id];
			// Сообщаем Loader
			this.emit(id + ':end', result);

			// Увеличиваем счётчик завершённых экшнов
			this._endedCount++;
		},

		awaitEnd: function(id) {
			// Если экшн уже давно выполнился
			if (id <= this._endedCount) {
				return Promise.resolve();
			}

			// Ожидаем выполнения экшна
			return new Promise(function(resolve) {
				this.one(id + ':end', resolve);
			}.bind(this));
		},
	};

	return ActionQueue;

});
