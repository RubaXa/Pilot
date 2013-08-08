<a name="install" data-name="Installation"></a>
## Installation, testing, assembling
`npm install pilotjs`<br/>
`cd pilotjs`<br/>
`npm install`<br/>
`grunt`


---


## Pilot
Multifunctional JavaScript router solves the problem of routing your application,
providing full control over the route. It can work either by itself or as a part
of other framework, such as Backbone, in which it could be an excellent substitute
for the standard `Backbone.Router` and even `Backbone.View`. Just try it.

---

<a name="Pilot.constructor"></a>
### constructor([options`:Object`])`:void`

* options — parameter object, see an Example

```js
var Ivan = new Pilot({
    el: null // container, which is used to intercept clicks
  , production: false  // this one is needed for switching off logging and error display
});
```

---

<a name="Pilot.getUrl"></a>
### getUrl(id`:String`, params`:Object`[, extra`:Object`])`:String`
Get url by route id. You can use this method to construct url by route id and parameters without keeping links inside.

* id — unique route identifier
* params — parameters used to construct url
* extra — additional parameters


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
Navigation by the route id. It is often necessary not only to understand how user moved,
but also to move user to the correct url, depending on his actions. This method allows you
to change the route, operating with its id and parameters only.

* id — unique route identifier
* params — parameters used to construct url

```js
var Ivan = new Pilot;

Ivan.route('coordinates', '/coordinates/:lat/:long', function (evt, req){ });

Ivan.go('coordinates', { lat: 16 }); // location: "/coordinates/16/"
Ivan.go('coordinates', { lat: 16, long: 178 }); // location: "/coordinates/16/178/"
```

---

<a name="Pilot.nav"></a>
### nav(url`:String`[, force`:Boolean`])`:jQuery.Deffered`
Navigation by url. With the call of this method, router finds all the handlers for this route and goes to it.
If url has not been changed, the transition will not be executed, but you can get round it using `force` parameter.

* url — relative or absolute url
* force — force the user to move to the url even if he's already on it

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
Start router. When called with no parameters, the initial url is obtained through `Pilot.getLocation`.

* url — initial routing point

---

<a name="Pilot.route:simple"></a>
### route(pattern`:String`, handler`:Function`[, withEndEvent`:Boolean`])`:Pilot`
A simple way to add a route.

* pattern — used for matching request while navigation
* handler — called with `event` and `request` parameters, if `pattern` matched with url
* withEndEvent — calls `handler` in the end of route


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
A simple way to add a named route.

* id — unique route identifier
* other [parameters](#Pilot.route:simple)


```js
Ivan.route('base', '/base/:lat/:long');

// Navigate by id
Ivan.go('base', { lat: 16, lon: 179 }); // location: /base/16/179
```

---

<a name="Pilot.route:ctrl"></a>
### route(pattern`:String`, ctrl`:Object|Pilot.Route`[, options:Object])`:Pilot`
Add a route controller. Route controller is a powerful tool. With its help one you can tell the
router (passing `Deffered` parameter), that it ought to wait for the receipt of data and only
then make the move to the route. This approach works well in combination with multiple controllers
on one route, where each one performs its small task, e.g., the first one gets a banner, the second
one get list of posts, and the third one gets user profile.

* ctrl — controller methods or successor `Pilot.Route`
* options — initialization options


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
Add a named route controller.

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
Create a group and assign routes relative to it.

* pattern — base pattern

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
Create a named group

* id — unique route identifier

---

<a name="Pilot.closeGroup"><a/>
### closeGroup()`:Pilot`
Close the group and return the last one or router.

---

<a name="Pilot.on"><a/>
### on(events`:String`, fn`:Function`)`:Pilot`
Add a handler for one or more events. Pilot has four events: `beforeroute`, `route`, `404` и `error`

* events — one or more events, `namespace` can be used
* fn — handler function

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
Switch off event handler.

* events — one or more events, `namespace` can be used
* fn — handler function

```js
new Pilot
	// Subscribe
	.on('route.one', function (evt/**$.Event*/, req/**Pilot.Request*/){
		// Unsubscribe using namespace
		this.off('.one');
	})
;
```

---

<a name="Pilot.emit"><a/>
### emit(event`:String`[, args`:Array`])`:Pilot`
Emit event.

* event — event name
* args — extra arguments

```js
var Ace = new Pilot
	.on('custom', function (evt/**$.Event*/, foo/**String*/){  })
;


// Emit event
Ace.emit('custom', ["foo"]);
```

---

<a name="Pilot.history"><a/>
### history`:Array`
Browsing history, the behavior is similar to `window.history`.

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
Verify that you can go back through `history`

---

<a name="Pilot.hasForward"><a/>
### hasForward()`:Boolean`
Verify that you can go forward through `history`

---

<a name="Pilot.back"><a/>
### back()`:jQuery.Deffered`
Go to the previous url in `history`

---

<a name="Pilot.forward"><a/>
### forward()`:jQuery.Deffered`
Go to the next url relative to the current position in `history`

---

<a name="Pilot.Route"><a/>
## Pilot.Route
This class of the route controller allows not only to control events of starting,
changing or ending of the route, but also to inform the router that before going to
the correct url it has to wait the collection of data necessary to this controller.

---

<a name="Pilot.Route.@events"></a>
### @events
Available events: `routestart`, `routechange` and `routeend`.
There is also `route` event, which is similar to `routestart` and `routechange`.

```js
var airbase = Pilot.Route.extend({
	init: function (){
		this.on('routestart routeend', function (evt/**$.Event*/, req/**Pilot.Request*/){
			// ...
		});
	},

	onRoute: function (evt/**$.Event*/, req/**Pilot.Request*/){
		// You can also define a method with the name of the event
	}
});
```

---

<a name="Pilot.Route.accessPermission"></a>
### accessPermission`:String`

```js
Pilot.access['denied'] = function (req/**Pilot.Request*/){
	return	false;
};

var Spy = new Pilot;

Spy.route('/public/', function (){ console.log("Public!"); })

Spy.route('/private/', {
	accessPermission: 'denied', // permission
	accessDeniedRedirectTo: '/public/'
});

Spy.route('/public/closed/', {
	accessPermission: 'denied', // permission
	accessDeniedRedirectTo: '..'
});


Spy.nav('/private/'); // "Public!"
Spy.nav('/public/closed/'); // "Public!"
```

---

<a name="Pilot.Route.accessDeniedRedirectTo"></a>
### accessDeniedRedirectTo`:String`
Adopt such values ​​as: `url`, `route id`, `function` or `..` to rise to a up level.

```js
var ClosedBase = Pilot.Route.extend({
	accessPermission: false,
	accessDeniedRedirectTo: function (req/**Pilot.Request*/){
		return	this.router.getUrl('home');
	}
});
```


---


<a name="Pilot.Route.inited"><a/>
### inited`:Boolean`
Route initialization flag.

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
Link to the router.

---

<a name="Pilot.Route.boundAll"><a/>
### boundAll`:Array`
List of methods that will be executed in the context of the object.
It's very convenient for using with functions which will be used as event handlers.

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
Bound the method with the context of the controller.

* fn — function or its name in the controller

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
This method is intended to redefine and should be called once at the time of initialization of the controller.
Remember that the initialization is not involved in creating the instance, that occurs in the first
call of the controller after `loadData`, but before the `routestart` event.

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
This method should be called before `routestart`, `routechange`.
If `$.Deffered` returns, router will wait for the end of the controller data collection
and then execute the navigation.

* req — request object

```js
var airport = Pilot.Route.extend({
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
Get url by route id. You can use this method to construct url by route id and parameters without keeping links inside.

* id — unique route identifier
* params — parameters used to construct url
* extra — additional parameters

---

<a name="Pilot.Route.getData"><a/>
### getData()`:Object`
A simple method to get controller data.

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
Set new controller data or merge with the current ones.

* data — new data
* merge — merge with the current ones

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
`Pilot.Route` successor implements methods for working with DOM elements, events and patterning.
By default, `Pilot.View` is subscribed to `routestart` and `routeend` events and controls the visibility
of a DOM element associated with it, setting it to `display: none` or removing it.

---

<a name="Pilot.View.el"><a/>
### el`:HTMLElement`
Link to the DOM element, with which `View` is working.

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
jQuery collection, for more convenient work.

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
If you specify this option, this tag will be created while the initialization.

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
Create a tag and put it in the container.

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
Here can be any patterning function.

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
This method is called at the start and in the end of the route.
Its redefining can help you change the way elements are displayed, e.g., to add the animation.

* state — `true`: route start, `false`: route end

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
Set the element with which 'View' is working (automatically changes `this.el` and `this.$el` properties).

* selector - string containing jQuery selector or HTMLElement, [detail](http://api.jquery.com/jQuery/)

---

<a name="Pilot.View.$"><a/>
### $(selector`:jQuerySelector`)`:jQuery`
Select elements inside the 'View' (equal to `this.$el.find`, but more easy).

* selector - string containing jQuery selector or HTMLElement, [detail](http://api.jquery.com/jQuery/)

---

<a name="Pilot.View.getHtml"><a/>
### getHtml([data`:Object`])`:String`
Get HTML based on `this.template` and sent data or 'View' data.

* data — data for patterning

---

<a name="Pilot.View.render"><a/>
### render()`:void`
Refresh HTML `this.el` by `this.getHtml()`

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
	<li>`/search/` — strict match</li>
	<li>`/gallery/:tag/` — parameterized</li>
	<li>`/search/result/:page?` — parameterized  (optional)</li>
	<li>`/user/:id(\\d+)` — parameter validation</li>
	<li>`/search/(result/:page/)?` — grouping</li>
</ul>

---

<a name="Pilot.Request"></a>
## Pilot.Request
route: `/gallery/:tag/:perPage?(/page/:page)?`<br/>
request: `/gallery/cubism/20/page/123?search=text`

<a name="Pilot.Request.@extend"></a>
### @extend
Add and use its methods, eg:

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
Absolute url: `http://domain.com/gallery/cubism/20/page/3?search=text`

### path`:String`
The path relative to the web-site root: `/gallery/cubism/20/page/3`

### search`:String`
GET parameters string: `?search=text`

### query`:Object`
GET parameters object: `{ search: "text" }`

### params`:Object`
Route parameters: `{ tag: "cubism", perPage: 20, page: 123 }`

### referrer`:String`
Contains url of previous request: `http://domain.com/gallery/cubism/20/page/12`

### clone()`:Pilot.Request`
Clone method.


---

<a name="HistoryAPI"></a>
## History API
By default, the library doesn't contain any polyfills and rely only on native support.


<a name="Pilot.pushState"></a>
### Pilot.pushState`:Boolean`
Use the full History API, otherwise `location.hash`.

```js
Pilot.pushState = true;
```


<a name="Pilot.getLocation"></a>
### Pilot.getLocation()`:String`
Get current location.


<a name="Pilot.setLocation"></a>
### Pilot.setLocation(req`:Object`)`:void`
Set a new location.

* req — request object


---



<a name="changelog"></a>
## Changelog

### 1.3
<ul>
	<li>+ `accessPermission` route option</li>
	<li>+ `accessDeniedRedirectTo` route option</li>
</ul>

### 1.2.1
<ul>
	<li>+ Support Zepto, Ender or $</li>
	<li>Fixed set request params</li>
	<li>Fixed Pilot options</li>
</ul>

### 1.2.0
<ul>
	<li>[#4](https://github.com/RubaXa/Pilot/pull/4): Added Pilot.Request.</li>
	<li>+ Pilot.utils.each</li>
	<li>+ Pilot.utils.extend</li>
	<li>+ Pilot.utils.qs.parse(queryString)/**Object*/<li>
	<li>+ Pilot.utils.qs.stringify(queryObject)/**String*/<li>
</ul>

### 1.1.0
<ul>
	<li>[#3](https://github.com/RubaXa/Pilot/pull/3): Allow customize selector for links.</li>
</ul>


### 1.0.0
First release
