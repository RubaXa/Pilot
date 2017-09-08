Pilot v2
--------
Multifunctional JavaScript router solves the problem of routing your application, providing full control over the route.


### Get started

```js
const router = Pilot.create({
	'#route-id': {
		url: '/:any?', // route pattern
		onroute(/**Pilot.Request*/req) {
		}
	}
});

// Запускаем перехват ссылок и history api
router.listenFrom(document, {autoStart: true});

// Где-то в коде
router.go('#route-id').then(() => ...);
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


### `Pilot` livecycle

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

#### go(id[, params[, query]]):`Promise`

 - **id**:`string` — route id
 - **params**:`object` — route parametrs (optional)
 - **query**:`object|inherit` — route GET-query parametrs (optional)

---

#### nav(url):`Promise`

 - **url**:`string`

---

### `Pilot.Route` methods and properties

#### model:`Object`
Local models.

---

#### init()
Protected method.

---

#### getUrl([params]):`string`

 - **params**:`Object` (optional)
 - **query**:`object|inherit` — route GET-query parametrs (optional)

---

#### is(id):`boolean`

 **id**:string — route id or space-separated list
