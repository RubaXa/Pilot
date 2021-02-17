
declare module 'pilotjs/vendors/Emitter' {
	// ==== ./vendors/Emitter.js ====

	type EventListener = (...args: any[]) => any;

	namespace Emitter {
		export class Event<T = any, D = undefined, R = any> {
			target: T;
			details: D;
			result?: R;

			constructor(type: string | Object | Event);

			isDefaultPrevented(): boolean;

			preventDefault();

			stopPropagation();

			isPropagationStopped(): boolean;
		}
	}

	class Emitter {
		constructor();

		on(events: string, fn: EventListener): this;

		off(events: string, fn: EventListener): this;

		one(events: string, fn: EventListener): this;

		emit(type: string, args: any[]): any;

		trigger(type: string, args: any[], details?: any): this;

		static readonly version: string;

		static apply<T extends object>(target: T): T & Emitter;

		static getListeners(target: Object, name: string): EventListener[];
	}

	export = Emitter;
}

declare module 'pilotjs' {

	// ==== ./src/action-queue.js ====

	import Emitter = require("pilotjs/vendors/Emitter");

	namespace Pilot {
		export type ActionQueuePriority = number;
		export type ActionId = number;

		export interface Action {
			type: string;
			uid?: ActionId;
			priority?: ActionQueuePriority;
		}

		class ActionQueue extends Emitter {
			constructor();

			push(request: Request, action: Action): ActionId;

			static readonly PRIORITY_HIGH: ActionQueuePriority;
			static readonly PRIORITY_LOW: ActionQueuePriority;
		}

		// ==== ./src/loader.js ====

		export type LoaderProcessor = () => void;

		export interface LoaderOptions {
			persist?: boolean;
			processing?: LoaderProcessor;
		}

		export type LoaderModelFetcher = () => void;

		export interface LoaderModelObject {
			name: string;
			fetch: LoaderModelFetcher;
			match: Match;
		}

		export type LoaderModel = LoaderModelObject | LoaderModelFetcher;

		class Loader {
			readonly models: Record<string, LoaderModel | undefined>;
			readonly names: string[];

			constructor(models: Record<string, LoaderModel | undefined> | Loader, options: LoaderOptions);

			defaults(): Record<string, Object | undefined>;

			fetch(): Promise<any>;

			dispatch(): Promise<any>;

			extend(models: Record<string, LoaderModel | undefined>): Loader;

			getLastReq(): Request | undefined;

			extract(model: LoaderModel): Object;

			bind(route: Route, model: LoaderModel);

			setDebug(debug: boolean);

			static readonly ACTION_NAVIGATE: string;
			static readonly ACTION_NONE: string;
			static readonly PRIORITY_LOW: typeof ActionQueue.PRIORITY_LOW;
			static readonly PRIORITY_HIGH: typeof ActionQueue.PRIORITY_HIGH;
		}

		// ==== ./src/match.js ====

		export type MatchFn = (key: string) => boolean;
		export type MatchArray = string[];
		export type Match = MatchArray | MatchFn;

		// ==== ./src/querystring.js ====

		export type QueryItem = string | number | symbol;
		export type Query = Record<QueryItem, QueryItem | QueryItem[] | undefined>;

		interface QueryString {
			parse(search: string): Query;

			stringify(query: Query): string;
		}

		// ==== ./src/request.js ====

		class Request {
			href: string;
			protocol: string;
			host: string;
			hostname: string;
			port: string;
			path: string;
			pathname: string;
			search: string;
			query: Query;
			params: Record<string, string | undefined>;
			hash: string;
			route: Route;
			router: Pilot;
			referrer?: string;
			redirectHref?: string;
			alias?: string;

			constructor(url: string | URL, referrer?: string, router?: string);

			clone(): Request;

			is(id: string): boolean;

			redirectTo(href: string, interrupt?: boolean);

			toString(): string;
		}

		// ==== ./src/route.js ====

		export interface RouteUrlParamsConfig {
			default?: any;
			decode: (value: string) => any;
		}

		export type UrlBuilder = (params: Record<string, any>, query: Query) => string;

		export interface RouteUrlObject {
			pattern: string;
			params?: Record<string, RouteUrlParamsConfig | undefined>;
			toUrl?: (params: Record<string, any>, query: Query, builder: UrlBuilder) => string;
		}

		export type RouteUrl = string | RouteUrlObject;

		export interface RouteOptions {
			model?: Loader;
			aliases?: Record<string, RouteUrlObject | undefined>;
		}

		export type Model = Record<string, Object | undefined>;

		class Route extends Emitter {
			id: string;
			active?: boolean;
			regions: string[];
			router: Pilot;
			model: Model;
			parentId?: string;
			parentRoute?: Route;

			constructor(options: RouteOptions, router: Pilot);

			protected init();

			protected _initOptions(options: RouteOptions);

			protected _initMixins();

			handling(url: URL, req: Request, currentRoute: Route, model: Record<string, Object | undefined>);

			match(URL: URL, req: Request): boolean;

			fetch(req: Request): Promise<Object>;

			getUrl(params: Record<string, string | undefined>, query: Query | 'inherit'): string;

			is(id: string): boolean;

			on(event: 'before-init', fn: (event: Emitter.Event<Route>) => any): this;
			on(event: 'init', fn: (event: Emitter.Event<Route>) => any): this;
			on(event: 'model', fn: (event: Emitter.Event<Route>, model: Model, req: Request) => any): this;
			on(event: 'route-start', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			on(event: 'route-change', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			on(event: 'route', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			on(event: 'route-end', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			on(events: string, fn: EventListener): this;

			one(event: 'before-init', fn: (event: Emitter.Event<Route>) => any): this;
			one(event: 'init', fn: (event: Emitter.Event<Route>) => any): this;
			one(event: 'model', fn: (event: Emitter.Event<Route>, model: Model, req: Request) => any): this;
			one(event: 'route-start', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			one(event: 'route-change', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			one(event: 'route', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			one(event: 'route-end', fn: (event: Emitter.Event<Route>, req: Request) => any): this;
			one(events: string, fn: EventListener): this;

			static readonly Region: typeof Region;
		}

		class Region extends Route {
			constructor(name: string, options: RouteOptions, route: Route);
		}

		// ==== ./src/status.js ====

		class Status {
			code: number;
			details?: any;

			constructor(code: number, details?: any);

			toJSON(): Object;

			static from(value: any): Status;
		}

		// ==== ./src/url.js ====

		class URL {
			protocol: string;
			protocolSeparator: string;
			credhost: string;
			cred: string;
			username: string;
			password: string;
			host: string;
			hostname: string;
			port: string;
			origin: string;
			path: string;
			pathname: string;
			segment1: string;
			segment2: string;
			search: string;
			query: Query;
			params: Record<string, string | string[] | undefined>;
			hash: string;

			constructor(url: string, base?: string | URL | Location);

			setQuery(query: string | Query, remove?: boolean | string[]): URL;

			addToQuery(query: Query): URL;

			removeFromQuery(query: string | string[]): URL;

			update(): URL;

			toString(): string;

			static parse(url: string): URL;

			static readonly parseQueryString: QueryString["parse"];
			static readonly stringifyQueryString: QueryString["stringify"];

			static toMatcher(pattern: string | RegExp): RegExp;

			static match(pattern: string | RegExp, url: string | URL): Record<string, string | undefined>;
		}

		// ==== ./src/pilot.js ====

		export type AccessFunction = (route: Route) => Promise<void>;

		export interface PilotRouteOption {
			url?: RouteUrlObject;
		}

		export interface PilotRouteOptions {
			url?: string;
			access?: AccessFunction;
		}

		export type PilotRouteMap = PilotRouteOptions | Record<string, PilotRouteOption | undefined>;

		export interface PilotNavDetails {
			initiator?: string;
			replaceState?: boolean;
			force?: boolean;
		}

		export interface PilotCompatibleLogger {
			add(key: string, details?: any);

			call(key: string, details: any, wrappedContent: () => void);
		}

		export type PilotListenFilter = (url: string) => boolean;

		export interface PilotListenOptions {
			logger?: PilotCompatibleLogger;
			autoStart?: boolean;
			filter?: PilotListenFilter;
			replaceState?: boolean;
		}
	}

	class Pilot extends Emitter {
		model: Object;
		request: Pilot.Request;
		route?: Pilot.Route;
		activeRoute?: Pilot.Route;
		// @deprecated use Pilot.url
		activeUrl: Pilot.URL;
		url: Pilot.URL;
		activeRequest?: Pilot.Request;
		routes: Pilot.Route[];

		constructor(map: Pilot.PilotRouteMap);

		getUrl(id: string, params?: Record<string, string | undefined>, query?: Pilot.Query | 'inherit'): string;

		go(id: string, params?: Record<string, string | undefined>, query?: Pilot.Query | 'inherit', details?: Object): Promise<any>;

		nav(href: string | Pilot.URL | Request, details?: Pilot.PilotNavDetails): Promise<any>;

		listenFrom(target: HTMLElement, options: Pilot.PilotListenOptions);

		reload();

		on(event: 'before-route', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request) => any): this;
		on(event: 'error', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, error: unknown) => any): this;
		on(event: 'route-fail', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route, error: unknown) => any): this;
		on(event: 'route', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route) => any): this;
		on(event: 'route-end', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route) => any): this;
		on(event: 'beforereload', fn: (event: Emitter.Event<Pilot>) => any): this;
		on(event: 'reload', fn: (event: Emitter.Event<Pilot>) => any): this;
		on(event: 'reloadend', fn: (event: Emitter.Event<Pilot, { cancelled: boolean }>) => any): this;
		on(events: string, fn: EventListener): this;

		one(event: 'before-route', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request) => any): this;
		one(event: 'error', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, error: unknown) => any): this;
		one(event: 'route-fail', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route, error: unknown) => any): this;
		one(event: 'route', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route) => any): this;
		one(event: 'route-end', fn: (event: Emitter.Event<Pilot, Pilot.PilotNavDetails>, req: Request, currentRoute: Pilot.Route) => any): this;
		one(event: 'beforereload', fn: (event: Emitter.Event<Pilot>) => any): this;
		one(event: 'reload', fn: (event: Emitter.Event<Pilot>) => any): this;
		one(event: 'reloadend', fn: (event: Emitter.Event<Pilot, { cancelled: boolean }>) => any): this;
		one(events: string, fn: EventListener): this;

		static create(map: Pilot.PilotRouteMap): Pilot;

		static readonly queryString: Pilot.QueryString;
		static readonly version: string;
	}

	export default Pilot;

}
