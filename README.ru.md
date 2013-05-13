<a name="install" data-name="Installation"></a>
## Установка, тестирование, сборка
`npm install pilotjs`<br/>
`cd pilotjs`<br/>
`npm install`<br/>
`grunt`


---


## Pilot
Многофункциональный JavaScript router, решает проблему маршрутизации вашего приложения,
обеспечивая полный контроль над маршрутом. Может работать как сам по себе, так и другими framework'ами,
например Backbone, где он станет прекрасной заменой стандартным `Backbone.Router` и даже `Backbone.View`,
просто попробуйте.

---

<a name="Pilot.constructor"></a>
### constructor([options`:Object`])`:void`

* options — объект параметров, см. пример

```js
var Ivan = new Pilot({
    el: null // контейнер, с которого нужно перехватывать клики
  , production: false  // нужен для отключения логирования и вывода ошибок
});
```

---

<a name="Pilot.getUrl"></a>
### getUrl(id`:String`, params`:Object`[, extra`:Object`])`:String`
Получить url, по id маршрута. Чтобы не зашивать ссылки внутри, вы можете использовать данный метода,
который по id маршрута и параметрам, собирает готовый url.

* id — уникальный идентификатор маршрута
* params — параметры, которые будут использованы при построении url
* extra — дополнительные параметры


```js
var Ivan = new Pilot;

// Add route
Ivan.route('address', '/:city/(street/:id/)', function (evt, req){ });

Ivan.getUrl('address'); // return "/"
Ivan.getUrl('address', { city: 'berlin' }); // "/berlin/"
Ivan.getUrl('address', { city: 'berlin', id: 123 }); // "/berlin/street/10/"
```

---

<a name="Pilot.go"></a>
### go(id`:String`[, params`:Object`])`:jQuery.Deffered`
Навигация по id маршрута. Часто нужно не только понять, как переместился пользователь,
но и в зависимости от его действий перейти на нужный url, этот метод позволяет сменить маршрут,
оперируя только его id и параметрами.

* id — уникальный идентификатор маршрута
* params — параметры, которые будут использоваться для построения url

```js
var Ivan = new Pilot;

Ivan.route('coordinates', '/coordinates/:lat/:long', function (evt, req){ });

Ivan.go('coordinates', { lat: 16 }); // location: "/coordinates/16/"
Ivan.go('coordinates', { lat: 16, long: 178 }); // location: "/coordinates/16/178/"
```

---

<a name="Pilot.nav"></a>
### nav(url`:String`[, force`:Boolean`])`:jQuery.Deffered`
Навигация по url. Вызывая этот метод, роутер найдет все обработчики, для данного
маршрута и перейдет на него. Если url не изменился, то переход выполнен не будет,
но это можно обойти, используй параметр `force`.

* url — относительный или абсолютный url
* force — все равно перейти на нужный урл, даже если мы уже там

```js
var Ivan = new Pilot
            .on('beforeroute', function (req){  })
            .on('route', function (req){  })
            .on('404', function (req){ console.log('Route not found'); })
            .route('/base/moscow/', function (evt, req){
            	console.log('Greetings from Moscow');
            })
;

Ivan.nav('/base/moscow/'); // "Greetings from Moscow"
Ivan.nav('/base/moon/'); // "Route not found"
```

---

<a name="Pilot.start"></a>
### start([url`:String`])`:void`
Запустить роутер. Если вызывать без параметров, начальный url будет получен через `Pilot.getLocation`.

* url — начальная "точка" маршрутизации

---

<a name="Pilot.route:simple"></a>
### route(pattern`:String`, handler`:Function`[, withEndEvent`:Boolean`])`:Pilot`
Простой способ добавления маршрута.

* pattern — будет использован, для сопоставления с запросом при навигации
* handler — будет вызван с двумя параметрами event и request, если pattern подошел к url
* withEndEvent — вызывать `handler` при завершении маршрута


```js
// Without "routeend"
Ivan.route('/airport/', function (evt, req){
    console.log(evt.type, '-> ', req.path);
});

// With "routeend"
Ivan.route('/:city/(street/:id/)', function (evt, req){
    if( evt.type == 'routeend' ){
        console.log(evt.type, '-> ', req.referrer.path);
    } else {
        console.log(evt.type, '-> ', req.params.city, ', ', req.params.id);
    }
}, true);

Ivan.nav('/airport/');        // "routestart -> /airport/"
Ivan.nav('/home/street/123'); // "routestart -> home, 123"
Ivan.nav('/home/street/321'); // "routechange -> home, 321"
Ivan.nav('/airport/');        // "routestart -> /airport/"
                              // "routeend -> /home/street/321/"
```

---

<a name="Pilot.route:simple-id"></a>
### route(id`:String`, pattern`:String`, handler`:Function`[, withEndEvent`:Boolean`])`:Pilot`
Простой способ добавления именного маршрута.

* id — уникальный идентификатор маршрута
* other [parameters](#Pilot.route:simple)


```js
Ivan.route('base', '/base/:lat/:long');

// Navigate by id
Ivan.go('base', { lat: 16, lon: 179 }); // location: /base/16/179
```

---

<a name="Pilot.route:ctrl"></a>
### route(pattern`:String`, ctrl`:Object|Pilot.Route`[, options:Object])`:Pilot`
Добавить контроллер маршрута. Контроллер маршрута — это уже серьезно, с помощью его можно
сообщить роутеру (передав Deffered), что сначала нужно дождаться получения данных и только потом, осуществить
переход на маршрут. Такой подход хорош в сочетании с множественными контроллерами на один маршрут,
где каждый выполняет свою маленькую задачу, например один получает баннер, другой список постов, а третий
профиль юзера.

* ctrl — методы котроллера или наследник `Pilot.Route`
* options — будут переданным при инстанцировании контроллера


```js
Ivan.route('/base/:id', {
    loadData: function (req){
        return $.ajax('/base/get/'+req.params.id, function (base){
            this.setData(base);
        }.bind(this));
    },
    onRoute: function (evt, req){
        // "routestart" and "routeend"
        var base = this.getData();
        console.log('route:', base.name);
    }
});

Ivan.nav('/base/123'); // "route: Kienitz"
```

---

<a name="Pilot.route:ctrl-id"></a>
### route(id`:String`, pattern`:String`, ctrl`:Object|Pilot.Route`[, options:Object])`:Pilot`
Добавить именованный контроллер маршрута.

```js
var airport = Pilot.Route.extend({
    onRoute: function (){
        console.log('base:', this.getData().name);
    }
});

Ivan
    .route('/base/1', airport, { data: { name: 'Moscow' } })
    .route('/base/2', airport, { data: { name: 'Yaroslavl' } })
;

Ivan.nav('/base/1'); // "base: Moscow"
Ivan.nav('/base/2'); // "base: Yaroslavl"
```

---

<a name="Pilot.createGroup"><a/>
### createGroup(pattern`:String`)`:Pilot`
Создайте группу и назначайте маршруты относительно её.

* pattern — базавый паттерн

```js
var Ivan = new Pilot;
            .createGroup('/base/')
                .route('.', function (evt, req){ console.log('def'); })
                .route(':id', function (evt, req){
                	console.log('base: '+.req.params.id);
                })
                .closeGroup()
;

Ivan.nav('/base/'); // "def"
Ivan.nav('/base/123/'); // "base: 123"
```

---

<a name="Pilot.createGroup-id"><a/>
### createGroup(id`:String`, pattern`:String`)`:Pilot`
Создание именованной группы

* id — уникальный идентификатор маршрута

---

<a name="Pilot.closeGroup"><a/>
### closeGroup()`:Pilot`
Закрыть группу и вернуть предыдущую, либо сам роутер

---

<a name="Pilot.on"><a/>
### on(events`:String`, fn`:Function`)`:Pilot`
Добавить обработчик одного или нескольких событий.
У Pilot есть четыре события: `beforeroute`, `route`, `404` и `error`

* events — одно или несколько событий, можно использовать namespace
* fn — функция обработчик

```js
new Pilot
	.on('beforeroute', function (evt/**$.Event*/, req/**Pilot.Request*/){ })
	.on('route', function (evt/**$.Event*/, req/**Pilot.Request*/){ })
	.on('404', function (evt/**$.Event*/, req/**Pilot.Request*/){ })
	.on('error', function (evt/**$.Event*/, err/**Error*/){ })
;
```

---

<a name="Pilot.off"><a/>
### off(events`:String`, fn`:Function`)`:Pilot`
Снять обработчик события.

* events — одно или несколько событий, можно использовать namespace
* fn — функция обработчик

```js
new Pilot
	// Подписываемся
	.on('route.one', function (evt/**$.Event*/, req/**Pilot.Request*/){
		// Отписываемся используя namespace
		this.off('.one');
	})
;
```

---

<a name="Pilot.emit"><a/>
### emit(event`:String`[, args`:Array`])`:Pilot`
Испустить событие.

* event — название события
* args — дополнительные аргументы

```js
var Ace = new Pilot
	.on('custom', function (evt/**$.Event*/, foo/**String*/){  })
;


// Испускаем событие
Ace.emit('custom', ["foo"]);
```

---

<a name="Pilot.history"><a/>
### history`:Array`
История навигации, поведение аналогично `window.history`.

```js
var Ace = new Pilot;

Ace.nav('/airport/');
Ace.nav('/airport/depot/');
// etc

console.log(Ace.history);
// ["http://site.com/airport/", "http://site.com/airport/depot/", ..]
```

---

<a name="Pilot.hasBack"><a/>
### hasBack()`:Boolean`
Проверка возможности перехода назад по `history`

---

<a name="Pilot.hasForward"><a/>
### hasForward()`:Boolean`
Проверка возможности перехода вперед по `history`

---

<a name="Pilot.back"><a/>
### back()`:jQuery.Deffered`
Перейти на предыдущий url в `history`

---

<a name="Pilot.forward"><a/>
### forward()`:jQuery.Deffered`
Перейти на следующий url, относительно текущий позиции в `history`

---

<a name="Pilot.Route"><a/>
## Pilot.Route
Класс контроллера маршрута, позволяет не только, контролировать события начала,
изменения и конца маршрута, но и сообщать роутеру, что перед переходом, на нужный url
нужно дождаться сбора данных, нужных этому контроллеру.

---

<a name="Pilot.Route.@events"></a>
### @events
Доступные события: `routestart`, `routechange` и `routeend`.
Также есть событие `route`, соответсвует `routestart` и `routechange`.

```js
var airbase = Pilot.Route.extend({
	init: function (){
		this.on('routestart routeend', function (evt/**$.Event*/, req/**Pilot.Request*/){
			// ...
		});
	},

	onRoute: function (evt/**$.Event*/, req/**Pilot.Request*/){
		// Также можно определить метод с названием события
	}
});
```

---

<a name="Pilot.Route.inited"><a/>
### inited`:Boolean`
Флаг инициализации маршрута.

```js
var airbase = Pilot.Route.extend({
	loadData: function (){
		if( !this.inited ){
			this.setData({ name: 'Ramstein' });
		}
	}
});
```

---

<a name="Pilot.Route.router"><a/>
### router`:Pilot`
Ссылка на роутер.

---

<a name="Pilot.Route.boundAll"><a/>
### boundAll`:Array`
Список методов, которые будут выполняться в контексте этого объекта.
Очень удобно для функций, которые будут использоваться в качестве обработчиков событий.

```js
var City = Pilot.Route.extend({
    name: 'Moscow',
    boundAll: ['matryoshka', 'vodka', 'balalaika'],
    init: function (){
        $('#take').click(this.matryoshka);
        $('#drink').click(this.vodka);
        $('#play').click(this.balalaika);
    },
    matryoshka: function (evt){ console.log(this.city+': take ', evt) },
    vodka: function (evt){ console.log(this.city+': drink ', evt) },
    balalaika: function (evt){ console.log(this.city+': play ', evt) },
});
```

---

<a name="Pilot.Route.bound"><a/>
### bound(fn`:String|Function`)`:Function`
Связать метод с контекстом контроллера.

* fn — функция, либо её название в контроллере

```js
var airport = Pilot.View.extend({
    el: '#airport',
    init: function (){
        // Bound function
        this.$el.on('mouseenter', this.bound(function (evt){
            this._onHover(evt);
        }));
        
        // Bound by method name
        this.$el.on('mouseleave', this.bound('_onHover'));
    },
    _onHover: function (evt){
        this.$el.toggleClass('hovered', evt.type == 'mouseenter');
    }
});
```

---

<a name="Pilot.Route.init"><a/>
### init()`:void`
Это метод рассчитан на переопределение и будет вызван один раз в момент инициализации контроллера.
Помните, что инициализация не связана созданием инстанса, она происходит при первом вызове контроллера,
после `loadData`, но до события `routestart`.

```js
var airport = Pilot.Route.extend({
    init: function (){
        this.$el = $('#airport');
    }
});
```

---

<a name="Pilot.Route.loadData"><a/>
### loadData(req`:Pilot.Request`)`:jQuery.Deffered|Null`
Метод будет вызван перед событием `routestart`, `routechange`. Если вренуть $.Deffered,
то роутер дождётся окончания сбора данных контроллера и только потом осуществит навигацию.

* req — объект запроса

```js
var airport = Pilot.Route.View.extend({
    loadData: function (req){
        return $.ajax('/load/data/', req.query, this.bound(function (data){
            this.setData( data );
        }));
    },
    onRoute: function (){
        var data = this.getData();
    }
});
```

---

<a name="Pilot.Route.getUrl"></a>
### getUrl(id`:String`, params`:Object`[, extra`:Object`])`:String`
Получить url, по id маршрута. Чтобы не зашивать ссылки внутри, вы можете использовать данный метода,
который по id маршрута и параметрам, собирает готовый url.

* id — уникальный идентификатор маршрута
* params — параметры, которые будут использованы при построении url
* extra — дополнительные параметры

---

<a name="Pilot.Route.getData"><a/>
### getData()`:Object`
Простой метод, для получения данных хранимых контроллером.

```js
var airport = Pilot.Route.extend({
    data: { name: 'default' }
});

(new airport).getData().name; // "default"
(new airport({ data: { name: 'NY' } })).getData().name; // "NY"
```

---

<a name="Pilot.Route.setData"><a/>
### setData(data`:Object`[, merge`:Boolean`])`:Pilot.Route`
Установит данные контроллера, или слить с текущими.

* data — новые данные
* merge — слить с уже установленными данными

```js
var airport = Pilot.Route.extend({
    data: { name: 'default', city: 'unknown' }
});

(new airport).setData({ name: 'Foo' }).getData();
// { name: 'Foo' }

(new airport).setData({ name: 'Foo' }, true).getData();
// { name: 'Foo', city: 'unknown' }

(new airport).setData({ name: 'Foo', city: 'Bar' }).getData();
// { name: 'Foo', city: 'Bar' }
```

---

<a name="Pilot.View"><a/>
## Pilot.View
Наследник Pilot.Route, имплементирует в себе методы для работы с DOM элементами, событиями и шаблонизацией.
По умолчанию, `Pilot.View` подписан события `routestart` и `routeend` контролируя видимость
DOM элемента, связанного с ним, выставляя ему `display: none` или убирая его.

---

<a name="Pilot.View.el"><a/>
### el`:HTMLElement`
Ссылка на DOM элемент, за которые отвечает вид.

```js
var airport = Pilot.View.extend({
    el: '#airport-default'
});

(new airport).el; // HTMLElement: <div id="airport-default">..</div>
(new airport({ el: '#moscow' })).el; // HTMLElement: <div id="moscow">..</div>
```

---

<a name="Pilot.View.$el"><a/>
### $el`:jQuery`
jQuery коллекция, для более удобной работы.

```js
var base = Pilot.View.extend({
    el: '#moscow'
});

(new base).el; // jQuery[<div id="moscow">..</div>]
(new base({ el: '#moon' })).el; // jQuery[<div id="moon">..</div>]
```

---

<a name="Pilot.View.tagName"><a/>
### tagName`:String`
Если указать этот параметр, то при инициализации будет создан этот тег.

```js
var base = Pilot.View.extend({
    tagName: 'span'
});

(new base).el; // HTMLElement: <span>..</span>
(new base).$el.appendTo('body'); // jQuery[<span>..</span>]
```

---

<a name="Pilot.View.tag"><a/>
### tag`:String`
Создать тег и вставить его в нужный контейнер.

```js
var base = Pilot.View.extend({
    tag: '#box span.base.base_military'
});

(new base).el; // HTMLElement: <span class="base base_military">..</span>
```

---

<a name="Pilot.View.singleton"><a/>
### singleton`:Boolean`

```js
var airbase = Pilot.View.extend({
	el: '#aribase',
	sigleton: true,
	onRouteStart: function (evt, req){
		console.log('start:', req.path);
	},
	onRouteChange: function (evt, req){
		console.log('change:', req.path);
	},
	onRouteStart: function (evt, req){
		console.log('end:', req.path);
	}
});

var Ivan = new Pilot
	.route('/sky/foo/', airbase)
	.route('/sky/bar/', airbase)
	.route('/sky/baz/', function (evt, req){
		console.log('Sky base Baz');
	})
	.route('/sky/qux/', airbase)
;

Ivan.nav('/sky/foo/'); // "start: /sky/foo/"
Ivan.nav('/sky/bar/'); // "change: /sky/bar/"
Ivan.nav('/sky/qux/'); // "change: /sky/qux/"
Ivan.nav('/sky/baz/'); // "Sky base Baz"
                       // "end: /sky/baz/"
```

---

<a name="Pilot.View.template"><a/>
### template`:Fucntion`
Тут может быть любая функция шаблонизации.

```js
var region = Pilot.View.extend({
    template: function (data/**Object*/){
    	/* "data" is equal this.getData() */
    	// Use any template engine
    	return	xtpl.fetch('templates/region.xtpl', data);
    }
});
```

---

<a name="Pilot.View.toggleView"><a/>
### toggleView(state`:Boolean`)`:void`
Это метод вызывается в начале маршрута и конце, переопределив его вы можете изменить способ, которым отображать
связанные элемент, например добавив анимацию.

* state — true начало маршрута, false - конец

```js
var region = Pilot.View.extend({
    toggleView: function (state/**Boolean*/){
    	this.$el.animate({ opacity: +state }, 'fast');
    }
});
```

---

<a name="Pilot.View.setElement"><a/>
### setElement(selector`:jQuerySelector`)`:Pilot.View`
Установить элемент, с которым работает вид, автоматически меняет свойства `this.el` и `this.$el`.

* selector - строка содержащая jQuery selector или HTMLElement, [detail](http://api.jquery.com/jQuery/)

---

<a name="Pilot.View.$"><a/>
### $(selector`:jQuerySelector`)`:jQuery`
Выбрать элементы внутри вида, равносильно `this.$el.find`, но более удобно.

* selector - строка содержащая jQuery selector или HTMLElement, [detail](http://api.jquery.com/jQuery/)

---

<a name="Pilot.View.getHtml"><a/>
### getHtml([data`:Object`])`:String`
Получить HTML на основе `this.template` и переданных данных, либо данных вида.

* data — данные для шаблонизации

---

<a name="Pilot.View.render"><a/>
### render()`:void`
Обновляет HTML `this.el`, при помощи `this.getHtml()`

```js
var city = Pilot.View.extend({
	templateFile: 'city/default.xtpl',
	template: function (obj){
		return xtpl.fetch(this.templateFile, obj);
	},
	onRoute: function (){
		this.render();
	}
});
```

---

<a name="Pattern-syntax></a>
## Pattern-syntax route
<ul style="line-height: 180%">
	<li>`/search/` — строгое соответсвие</li>
	<li>`/gallery/:tag/` — параметризованный</li>
	<li>`/search/result/:page?` — параметризованный (необязательный)</li>
	<li>`/user/:id(\\d+)` — валидация параметров</li>
	<li>`/search/(result/:page/)?` — группировка</li>
</ul>

---

<a name="Pilot.Request"></a>
## Pilot.Request
route: `/gallery/:tag/:perPage?(/page/:page)?`<br/>
request: `/gallery/cubism/20/page/123?search=text`

<a name="Pilot.Request.@extend"></a>
### @extend
Расширение объекта собственными методами.

```js
Pilot.Request.fn.getPage = function (){
	return	parseInt(this.params.page || this.query.page, 10) || 1;
};

(new Pilot)
	.route('/news/page/:page', function (evt, req/**Pilot.Request*/){
		var page = req.getPage();
		console.log('news.page:', page);
	})
	.route('/search/', function (evt, req/**Pilot.Request*/){
		var page = req.getPage();
		console.log('search.page:', page);
	})
	.nav('/news/page/') // news.page: 1
	.nav('/news/page/2/') // news.page: 2
	.nav('/search/?page=123') // search.page: 123
;
```

### url`:String`
Абсолютный url: `http://domain.com/gallery/cubism/20/page/3?search=text`

### path`:String`
Путь, относительно корня сайта: `/gallery/cubism/20/page/3`

### search`:String`
Строка GET-параметров: `?search=text`

### query`:Object`
Объект GET-параметров: `{ search: "text" }`

### params`:Object`
Параметры маршрута: `{ tag: "cubism", perPage: 20, page: 123 }`

### referrer`:String`
Содержит url предыдущего запроса: `http://domain.com/gallery/cubism/20/page/12`

---

<a name="HistoryAPI"></a>
## History API
По умолчанию, библиотека не содержит никаких полифилов и рассчитывает только на нативную поддержку.


<a name="Pilot.pushState"></a>
### Pilot.pushState`:Boolean`
Использовать полноценное History API, иначе `location.hash`.

```js
Pilot.pushState = true;
```


<a name="Pilot.getLocation"></a>
### Pilot.getLocation()`:String`
Получить текущее положение.


<a name="Pilot.setLocation"></a>
### Pilot.setLocation(req`:Pilot.Request`)`:void`
Установить новое положение.

* req — объект запроса

---

<a name="changelog"></a>
## Changelog

### 1.0.0
First release
