Pilot v2
--------
Multifunctional JavaScript router solves the problem of routing your application, providing full control over the route.


### Get started

```js
const router = Pilot.create({
	'#route-id': {
    url: '/:type(/:detail)?', // route pattern
    model: {
      user: (req) => fetch(`/api/${req.params.type}`).then(r => r.json()),
    },
		onroute(/**Pilot.Request*/req) {
      console.log(this.model.user);
		}
	}
});

// Запускаем перехват ссылок и history api
router.listenFrom(document, {autoStart: true});

// Где-то в коде
router.go('#route-id').then(() => ...);
router.getUrl('#route-id', {type: 'user'}); // '/user';
router.route.getUrl({type: 'user'}); // '/user';
router.route.getUrl({type: 'user', detail: 123}); // '/user/123';
```

---

### API

 - **create**(stitemap: `Object`): `Pilot`
 - **URL**([url: `string`[, base: `string`]]) — see [Native URL](https://developer.mozilla.org/ru/docs/Web/API/URL) and
   - **parse**(url: `string`)
   - **toMatcher**(pattern: `string|RegExp`)
   - `#properties`
     - **protocol**: `string`
     - **protocolSeparator**: `string`
     - **credhost**: `string`
     - **cred**: `string`
     - **username**: `string`
     - **password**: `string`
     - **host**: `string`
     - **hostname**: `string`
     - **port**: `string`
     - **origin**: `string`
     - **path**: `string` or **pathname**
     - **segment1**: `string`
     - **segment2**: `string`
     - **search**: `string`
     - **query**: `object`
     - **params**: `object`
     - **hash**: `string`
   - `#methods`
     - **addToQuery**(add: `object|string|null`)
     - **removeFromQuery**(remove: `string[]`)
     - **setQuery**(add: `object|string|null`[, remove: `string[]`)
 - **queryString**
   - **parse**(value: `string`): `object`
   - **stringify**(query: `object`): `string`

---


### `Pilot` lifecycle

#### beforeroute

 - **req**:`Pilot.Request`

---

#### route

 - **req**:`Pilot.Request`
 - **route**:`Pilot.Route`

---

#### routefail

 - **req**:`Pilot.Request`
 - **route**:`Pilot.Route`
 - **error**:`Error`

---

#### routeend

 - **req**:`Pilot.Request`
 - **route**:`Pilot.Route`

---

### `Pilot` methods and properties

#### model:`Object`
List of all models

---

#### request:`Pilot.Request`
Current Request.

---

#### activeUrl:`URL`
Active/Current URL.

---

#### route:`Pilot.Route`
Current route.

---

#### getUrl(id[, params[, query]]):`string`

 - **id**:`string` — route id
 - **params**:`object` — route parametrs (optional)
 - **query**:`object|inherit` — route GET-query parametrs (optional)

---

#### go(id[, params[, query[, details]]]):`Promise`

 - **id**:`string` — route id
 - **params**:`object` — route parameters (optional)
 - **query**:`object|inherit` — route GET-query parameters (optional)
 - **details**:`object` - route navigation details (options)

---

#### nav(url[, details]):`Promise`

 - **url**:`string`
 - **details**:`object` - route navigation details (options)

---

### `Pilot.Route` methods and properties

#### model:`Object`
Local models (inherit global models).

---

#### init()
Protected method.

---

#### getUrl([params, [query]]):`string`

 - **params**:`Object` (optional)
 - **query**:`object|inherit` — route GET-query parametrs (optional)

---

#### is(id):`boolean`

 **id**:string — route id or space-separated list


---

### `Pilot.Loader`

```js
const modelLoader = new Pilot.Loader({
  user: ({params:{id}}) => fetch(`/api/user/${id}`).then(r => r.json()),
  status: () => fetch(`/api/status`).then(r => r.json()),
}, {
  // неважно сколько раз вызвать `fetch`,
  // если уже есть запрос на сервер, новый не последует
  persist: true,

  // Обработку данных загруженной модели
  processingModel(modelName, modelData, req, models) {
    return {...modelData, pathed: true}; // or Promise
  },

  // Обработка ошибки при загрузки модели
  processingModelError(modelName, error, req, models) {
    return Promise.resolve({defaultData: 123}); // или undefined для reject
  },

  // Финальная обработка полученных данных
  processing(req, models) {
    return {...models, patched: true};
  },
});

// Используем `modelLoader`
const router = Pilot.create({
  model: modelLoader,
});

// Где-то в коде
modelLoader.fetch().then(model => {
  console.log(model.user);
  console.log(model.status);
});
```
