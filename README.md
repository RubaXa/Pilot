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

router.nav('/').then(() => ...);
```

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

#### getUrl(id[, params]):`string`

 - **id**:`string` — route id
 - **params**:object — route parametrs (optional)

---

#### go(id[, params]):`Promise`

 - **id**:`string` — route id
 - **params**:object — route parametrs (optional)

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

 - **params**:`Object`

---

#### is(id):`boolean`

 **id**:string — route id or space-separated list
