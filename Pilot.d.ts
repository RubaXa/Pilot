
// ==== ./vendors/Emitter.js ====

type EventListener = (...args: any[]) => any;

declare class Event {
	constructor(type: string | Object | Event);

	isDefaultPrevented(): boolean;
	preventDefault();
	stopPropagation();
	isPropagationStopped(): boolean;
}

declare class Emitter {
	constructor();

	on(events: string, fn: EventListener): this;
	off(events: string, fn: EventListener): this;
	one(events: string, fn: EventListener): this;
	emit(type: string, args: any[]): any;
	trigger(type: string, args: any[], details?: any): this;

	static readonly Event: typeof Event;
	static readonly version: string;

	static apply(target: Object): (typeof target) | Emitter;
	static getListeners(target: Object, name: string): EventListener[];
}

// ==== ./src/action-queue.js ====

export type ActionQueuePriority = number;
export type ActionId = number;

export interface Action {
	type: string;
	uid?: ActionId;
	priority?: ActionQueuePriority;
}

declare class ActionQueue extends Emitter {
	constructor();

	push(request, action: Action): ActionId;

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

declare class Loader {
	readonly models;
	readonly names: string[];

	constructor(models: Record<string, LoaderModel> | Loader, options: LoaderOptions);

	defaults(): Record<string, Object>;
	fetch(): Promise<any>;
	dispatch(): Promise<any>;
	extend(models: Record<string, LoaderModel>): Loader;
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

export type Query = Record<string, string | string[]>;

interface QueryString {
	parse(search: string): Query;
	stringify(query: Query): string;
}

// ==== ./src/request.js ====

declare class Request {
	href: string;
	protocol: string;
	host: string;
	hostname: string;
	port: string;
	path: string;
	pathname: string;
	search: string;
	query: Query;
	params: Record<string, string>;
	hash: string;
	route: Route;
	router: Pilot;
	referrer?: string;
	redirectHref?: string;
	alias?: string;

	constructor(url: string | Url, referrer?: string, router?: string);

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
	params?: Record<string, RouteUrlParamsConfig>;
	toUrl?: (params: Record<string, any>, query: Query, builder: UrlBuilder) => string;
}

export type RouteUrl = string | RouteUrlObject;

export interface RouteOptions {
	model?: Loader;
	aliases?: Record<string, RouteUrlObject>;
}

declare class Route extends Emitter {
	regions: string[];
	router: Pilot;
	model: Record<string, Object>;
	parentId?: string;
	parentRoute?: Route;

	constructor(options: RouteOptions, router: Pilot);

	protected init();
	protected _initOptions(options: RouteOptions);
	protected _initMixins();

	handling(url: Url, req: Request, currentRoute: Route, model: Record<string, Object>);
	match(URL: Url, req: Request): boolean;
	fetch(req: Request): Promise<Object>;
	getUrl(params: Record<string, string>, query: Query | 'inherit'): string;
	is(id: string): boolean;

	static readonly Region: typeof Region;
}

declare class Region extends Route {
	constructor(name: string, options: RouteOptions, route: Route);
}

// ==== ./src/status.js ====

declare class Status {
	code: number;
	details?: any;

	constructor(code: number, details?: any);

	toJSON(): Object;

	static from(value: any): Status;
}

// ==== ./src/url.js ====

declare class Url {
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
	params: Record<string, string>;
	hash: string;

	constructor(url: string, base: string | Url | Location);

	setQuery(query: string | Query, remove?: boolean | string[]): Url;
	addToQuery(query: Query): Url;
	removeFromQuery(query: string | string[]): Url;
	update(): Url;
	toString(): string;

	static parse(url: string): Url;
	static readonly parseQueryString: QueryString["parse"];
	static readonly stringifyQueryString: QueryString["stringify"];
	static toMatcher(pattern: string | RegExp): RegExp;
	static match(pattern: string | RegExp, url: string | Url): Record<string, string>;
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

export type PilotRouteMap = PilotRouteOptions | Record<string, PilotRouteOption>;

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

export default class Pilot extends Emitter {
	model: Object;
	request: Request;
	activeUrl: Url;
	routes: Route[];

	constructor(map: PilotRouteMap);

	getUrl(id: string, params?: Record<string, string>, query?: Query | 'inherit'): string;
	go(id: string, params?: Record<string, string>, query?: Query | 'inherit', details?: Object): Promise<any>;
	nav(href: string | Url | Request, details?: PilotNavDetails): Promise<any>;
	listenFrom(target: HTMLElement, options: PilotListenOptions);
	reload();

	static create(map: PilotRouteMap): Pilot;

	static readonly URL: typeof Url;
	static readonly Loader: typeof Loader;
	static readonly Status: typeof Status;
	static readonly Request: typeof Request;
	static readonly Route: typeof Route;
	static readonly queryString: QueryString;
	static readonly version: string;
}
