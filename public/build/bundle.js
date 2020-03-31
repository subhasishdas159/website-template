
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.20.1 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[10]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (207:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[9]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[9]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(207:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(route, userData, ...conditions) {
    	// Check if we don't have userData
    	if (userData && typeof userData == "function") {
    		conditions = conditions && conditions.length ? conditions : [];
    		conditions.unshift(userData);
    		userData = undefined;
    	}

    	// Parameter route and each item of conditions must be functions
    	if (!route || typeof route != "function") {
    		throw Error("Invalid parameter route");
    	}

    	if (conditions && conditions.length) {
    		for (let i = 0; i < conditions.length; i++) {
    			if (!conditions[i] || typeof conditions[i] != "function") {
    				throw Error("Invalid parameter conditions[" + i + "]");
    			}
    		}
    	}

    	// Returns an object that contains all the functions to execute too
    	const obj = { route, userData };

    	if (conditions && conditions.length) {
    		obj.conditions = conditions;
    	}

    	// The _sveltesparouter flag is to confirm the object was created by this router
    	Object.defineProperty(obj, "_sveltesparouter", { value: true });

    	return obj;
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(getLocation(), // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    	});
    }

    function pop() {
    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		window.history.back();
    	});
    }

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    		try {
    			window.history.replaceState(undefined, undefined, dest);
    		} catch(e) {
    			// eslint-disable-next-line no-console
    			console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    		}

    		// The method above doesn't trigger the hashchange event, so let's do that manually
    		window.dispatchEvent(new Event("hashchange"));
    	});
    }

    function link(node) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	// Destination must start with '/'
    	const href = node.getAttribute("href");

    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute");
    	}

    	// Add # to every href attribute
    	node.setAttribute("href", "#" + href);
    }

    function nextTickPromise(cb) {
    	return new Promise(resolve => {
    			setTimeout(
    				() => {
    					resolve(cb());
    				},
    				0
    			);
    		});
    }

    function instance($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent} component - Svelte component for the route
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {SvelteComponent} component - Svelte component
     * @property {string} name - Name of the Svelte component
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	const dispatchNextTick = (name, detail) => {
    		// Execute this code when the current call stack is complete
    		setTimeout(
    			() => {
    				dispatch(name, detail);
    			},
    			0
    		);
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, []);

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		nextTickPromise,
    		createEventDispatcher,
    		regexparam,
    		routes,
    		prefix,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		dispatch,
    		dispatchNextTick,
    		$loc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*component, $loc*/ 17) {
    			// Handle hash change events
    			// Listen to changes in the $loc store and update the page
    			 {
    				// Find a route matching the location
    				$$invalidate(0, component = null);

    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						// Check if the route can be loaded - if all conditions succeed
    						if (!routesList[i].checkConditions(detail)) {
    							// Trigger an event to notify the user
    							dispatchNextTick("conditionsFailed", detail);

    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);

    						// Set componentParams onloy if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    						// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    						if (match && typeof match == "object" && Object.keys(match).length) {
    							$$invalidate(1, componentParams = match);
    						} else {
    							$$invalidate(1, componentParams = null);
    						}

    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [
    		component,
    		componentParams,
    		routes,
    		prefix,
    		$loc,
    		RouteItem,
    		routesList,
    		dispatch,
    		dispatchNextTick,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\comps\lead.svelte generated by Svelte v3.20.1 */

    const file = "src\\comps\\lead.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div4;
    	let div3;
    	let div1;
    	let h1;
    	let t1;
    	let h2;
    	let t3;
    	let p0;
    	let br0;
    	let t5;
    	let p1;
    	let br1;
    	let t7;
    	let div0;
    	let button0;
    	let t9;
    	let button1;
    	let t11;
    	let button2;
    	let t13;
    	let div2;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Some text";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Some more text";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere similique ut deleniti ullam ex blanditiis enim, necessitatibus recusandae voluptatibus porro natus minus excepturi unde quasi minima animi. Illum, aliquid quasi!";
    			br0 = element("br");
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere similique ut deleniti ullam ex blanditiis enim, necessitatibus recusandae voluptatibus porro natus minus excepturi unde quasi minima animi. Illum, aliquid quasi!";
    			br1 = element("br");
    			t7 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Click here";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Click here";
    			t11 = space();
    			button2 = element("button");
    			button2.textContent = "Click here";
    			t13 = space();
    			div2 = element("div");
    			img = element("img");
    			attr_dev(h1, "class", "title is-size-1-desktop is-size-2-touch");
    			add_location(h1, file, 4, 8, 136);
    			attr_dev(h2, "class", "subtitle is-size-3-desktop is-size-4-touch");
    			add_location(h2, file, 5, 8, 212);
    			attr_dev(p0, "class", "is-size-5-desktop is-size-6-touch");
    			add_location(p0, file, 6, 8, 296);
    			add_location(br0, file, 6, 282, 570);
    			attr_dev(p1, "class", "is-size-5-desktop is-size-6-touch");
    			add_location(p1, file, 7, 8, 584);
    			add_location(br1, file, 7, 282, 858);
    			attr_dev(button0, "class", "button is-uppercase has-text-weight-semibold is-medium is-hidden-touch");
    			set_style(button0, "margin-top", "1rem");
    			set_style(button0, "background", "powderblue");
    			add_location(button0, file, 9, 10, 889);
    			attr_dev(button1, "class", "button is-uppercase has-text-weight-semibold is-hidden-desktop is-hidden-tablet-only is-fullwidth");
    			set_style(button1, "margin-top", "1rem");
    			set_style(button1, "background", "powderblue");
    			add_location(button1, file, 10, 10, 1053);
    			attr_dev(button2, "class", "button is-uppercase has-text-weight-semibold is-hidden-desktop is-hidden-mobile");
    			set_style(button2, "margin-top", "1rem");
    			set_style(button2, "background", "powderblue");
    			add_location(button2, file, 11, 10, 1244);
    			add_location(div0, file, 8, 8, 872);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file, 3, 6, 106);
    			if (img.src !== (img_src_value = "assets/park.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "park picture");
    			add_location(img, file, 15, 8, 1489);
    			attr_dev(div2, "class", "column is-hidden-touch");
    			add_location(div2, file, 14, 6, 1443);
    			attr_dev(div3, "class", "columns has-text-justified");
    			add_location(div3, file, 2, 4, 58);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file, 1, 2, 29);
    			attr_dev(section, "class", "section");
    			add_location(section, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, h2);
    			append_dev(div1, t3);
    			append_dev(div1, p0);
    			append_dev(div1, br0);
    			append_dev(div1, t5);
    			append_dev(div1, p1);
    			append_dev(div1, br1);
    			append_dev(div1, t7);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t9);
    			append_dev(div0, button1);
    			append_dev(div0, t11);
    			append_dev(div0, button2);
    			append_dev(div3, t13);
    			append_dev(div3, div2);
    			append_dev(div2, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Lead> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Lead", $$slots, []);
    	return [];
    }

    class Lead extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lead",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\comps\lead2.svelte generated by Svelte v3.20.1 */

    const file$1 = "src\\comps\\lead2.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div4;
    	let div3;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div2;
    	let h1;
    	let t2;
    	let h2;
    	let t4;
    	let p0;
    	let br0;
    	let t6;
    	let p1;
    	let t8;
    	let div1;
    	let br1;
    	let t9;
    	let button0;
    	let t11;
    	let button1;
    	let t13;
    	let button2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Some text";
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "Some more text";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere similique ut deleniti ullam ex blanditiis enim, necessitatibus recusandae voluptatibus porro natus minus excepturi unde quasi minima animi. Illum, aliquid quasi!";
    			br0 = element("br");
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere similique ut deleniti ullam ex blanditiis enim, necessitatibus recusandae voluptatibus porro natus minus excepturi unde quasi minima animi. Illum, aliquid quasi!";
    			t8 = space();
    			div1 = element("div");
    			br1 = element("br");
    			t9 = space();
    			button0 = element("button");
    			button0.textContent = "Click here";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "Click here";
    			t13 = space();
    			button2 = element("button");
    			button2.textContent = "Click here";
    			if (img.src !== (img_src_value = "assets/park.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "park picture");
    			add_location(img, file$1, 4, 8, 133);
    			attr_dev(div0, "class", "column is-hidden-touch");
    			add_location(div0, file$1, 3, 6, 87);
    			attr_dev(h1, "class", "title is-size-1-desktop is-size-2-touch");
    			add_location(h1, file$1, 7, 8, 250);
    			attr_dev(h2, "class", "subtitle is-size-3-desktop is-size-4-touch");
    			add_location(h2, file$1, 8, 8, 326);
    			attr_dev(p0, "class", "is-size-5-desktop is-size-6-touch");
    			add_location(p0, file$1, 9, 8, 410);
    			add_location(br0, file$1, 9, 282, 684);
    			attr_dev(p1, "class", "is-size-5-desktop is-size-6-touch");
    			add_location(p1, file$1, 10, 8, 698);
    			add_location(br1, file$1, 11, 13, 987);
    			attr_dev(button0, "class", "button is-uppercase has-text-weight-semibold is-medium is-hidden-touch");
    			set_style(button0, "margin-top", "1rem");
    			set_style(button0, "background", "powderblue");
    			add_location(button0, file$1, 12, 10, 1003);
    			attr_dev(button1, "class", "button is-uppercase has-text-weight-semibold is-hidden-desktop is-hidden-tablet-only is-fullwidth");
    			set_style(button1, "margin-top", "1rem");
    			set_style(button1, "background", "powderblue");
    			add_location(button1, file$1, 13, 10, 1167);
    			attr_dev(button2, "class", "button is-uppercase has-text-weight-semibold is-hidden-desktop is-hidden-mobile");
    			set_style(button2, "margin-top", "1rem");
    			set_style(button2, "background", "powderblue");
    			add_location(button2, file$1, 14, 10, 1358);
    			add_location(div1, file$1, 11, 8, 982);
    			attr_dev(div2, "class", "column has-text-justified");
    			add_location(div2, file$1, 6, 6, 201);
    			attr_dev(div3, "class", "columns");
    			add_location(div3, file$1, 2, 4, 58);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file$1, 1, 2, 29);
    			attr_dev(section, "class", "section");
    			add_location(section, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t2);
    			append_dev(div2, h2);
    			append_dev(div2, t4);
    			append_dev(div2, p0);
    			append_dev(div2, br0);
    			append_dev(div2, t6);
    			append_dev(div2, p1);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, br1);
    			append_dev(div1, t9);
    			append_dev(div1, button0);
    			append_dev(div1, t11);
    			append_dev(div1, button1);
    			append_dev(div1, t13);
    			append_dev(div1, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Lead2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Lead2", $$slots, []);
    	return [];
    }

    class Lead2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lead2",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\comps\features.svelte generated by Svelte v3.20.1 */

    const file$2 = "src\\comps\\features.svelte";

    function create_fragment$3(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let section0;
    	let h10;
    	let t1;
    	let p0;
    	let t2;
    	let strong0;
    	let t4;
    	let t5;
    	let div1;
    	let section1;
    	let h11;
    	let t7;
    	let p1;
    	let t8;
    	let strong1;
    	let t10;
    	let t11;
    	let div2;
    	let section2;
    	let h12;
    	let t13;
    	let p2;
    	let t14;
    	let strong2;
    	let t16;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			section0 = element("section");
    			h10 = element("h1");
    			h10.textContent = "Section";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("A simple container to divide your page into ");
    			strong0 = element("strong");
    			strong0.textContent = "sections";
    			t4 = text(", like the one you're currently reading");
    			t5 = space();
    			div1 = element("div");
    			section1 = element("section");
    			h11 = element("h1");
    			h11.textContent = "Section";
    			t7 = space();
    			p1 = element("p");
    			t8 = text("A simple container to divide your page into ");
    			strong1 = element("strong");
    			strong1.textContent = "sections";
    			t10 = text(", like the one you're currently reading");
    			t11 = space();
    			div2 = element("div");
    			section2 = element("section");
    			h12 = element("h1");
    			h12.textContent = "Section";
    			t13 = space();
    			p2 = element("p");
    			t14 = text("A simple container to divide your page into ");
    			strong2 = element("strong");
    			strong2.textContent = "sections";
    			t16 = text(", like the one you're currently reading");
    			attr_dev(h10, "class", "title is-size-3");
    			add_location(h10, file$2, 5, 10, 215);
    			add_location(strong0, file$2, 7, 56, 346);
    			attr_dev(p0, "class", "is-size-5");
    			add_location(p0, file$2, 6, 10, 267);
    			attr_dev(section0, "class", "section");
    			add_location(section0, file$2, 4, 8, 178);
    			attr_dev(div0, "class", "column");
    			add_location(div0, file$2, 3, 6, 148);
    			attr_dev(h11, "class", "title is-size-3");
    			add_location(h11, file$2, 13, 10, 535);
    			add_location(strong1, file$2, 15, 56, 666);
    			attr_dev(p1, "class", "is-size-5");
    			add_location(p1, file$2, 14, 10, 587);
    			attr_dev(section1, "class", "section");
    			add_location(section1, file$2, 12, 8, 498);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file$2, 11, 6, 468);
    			attr_dev(h12, "class", "title is-size-3");
    			add_location(h12, file$2, 21, 10, 855);
    			add_location(strong2, file$2, 23, 56, 986);
    			attr_dev(p2, "class", "is-size-5");
    			add_location(p2, file$2, 22, 10, 907);
    			attr_dev(section2, "class", "section");
    			add_location(section2, file$2, 20, 8, 818);
    			attr_dev(div2, "class", "column");
    			add_location(div2, file$2, 19, 6, 788);
    			attr_dev(div3, "class", "columns has-text-justified has-text-centered-mobile");
    			add_location(div3, file$2, 2, 4, 75);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file$2, 1, 2, 46);
    			attr_dev(div5, "class", "has-background-light section");
    			add_location(div5, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, section0);
    			append_dev(section0, h10);
    			append_dev(section0, t1);
    			append_dev(section0, p0);
    			append_dev(p0, t2);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, section1);
    			append_dev(section1, h11);
    			append_dev(section1, t7);
    			append_dev(section1, p1);
    			append_dev(p1, t8);
    			append_dev(p1, strong1);
    			append_dev(p1, t10);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, section2);
    			append_dev(section2, h12);
    			append_dev(section2, t13);
    			append_dev(section2, p2);
    			append_dev(p2, t14);
    			append_dev(p2, strong2);
    			append_dev(p2, t16);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Features> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Features", $$slots, []);
    	return [];
    }

    class Features extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Features",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\comps\footer.svelte generated by Svelte v3.20.1 */

    const file$3 = "src\\comps\\footer.svelte";

    function create_fragment$4(ctx) {
    	let footer;
    	let div;
    	let p;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div = element("div");
    			p = element("p");
    			strong = element("strong");
    			strong.textContent = "Website Template";
    			t1 = text(" by Subhasish Das.");
    			add_location(strong, file$3, 3, 6, 83);
    			add_location(p, file$3, 2, 4, 72);
    			attr_dev(div, "class", "content has-text-centered");
    			add_location(div, file$3, 1, 2, 27);
    			attr_dev(footer, "class", "footer svelte-1g1djdl");
    			add_location(footer, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div);
    			append_dev(div, p);
    			append_dev(p, strong);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Footer", $$slots, []);
    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\pages\home.svelte generated by Svelte v3.20.1 */

    function create_fragment$5(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let current;
    	const lead = new Lead({ $$inline: true });
    	const features = new Features({ $$inline: true });
    	const lead2 = new Lead2({ $$inline: true });

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(lead.$$.fragment);
    			t1 = space();
    			create_component(features.$$.fragment);
    			t2 = space();
    			create_component(lead2.$$.fragment);
    			document.title = "Home";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(lead, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(features, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(lead2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(lead.$$.fragment, local);
    			transition_in(features.$$.fragment, local);
    			transition_in(lead2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(lead.$$.fragment, local);
    			transition_out(features.$$.fragment, local);
    			transition_out(lead2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(lead, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(features, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(lead2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);
    	$$self.$capture_state = () => ({ Lead, Lead2, Features, Footer });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\pages\about.svelte generated by Svelte v3.20.1 */

    const file$4 = "src\\pages\\about.svelte";

    function create_fragment$6(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let h1;
    	let t2;
    	let h3;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to the about page";
    			t2 = space();
    			h3 = element("h3");
    			t3 = text("Click ");
    			a = element("a");
    			a.textContent = "here";
    			t5 = text(" for home");
    			document.title = "About";
    			attr_dev(h1, "class", "is-size-2");
    			add_location(h1, file$4, 6, 4, 111);
    			attr_dev(a, "href", "#/home");
    			attr_dev(a, "class", "has-text-success has-text-weight-bold");
    			add_location(a, file$4, 7, 14, 179);
    			add_location(h3, file$4, 7, 4, 169);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$4, 5, 2, 82);
    			attr_dev(div1, "class", "section");
    			add_location(div1, file$4, 4, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(h3, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\pages\booking.svelte generated by Svelte v3.20.1 */

    const file$5 = "src\\pages\\booking.svelte";

    function create_fragment$7(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let h1;
    	let t2;
    	let h3;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to the booking page";
    			t2 = space();
    			h3 = element("h3");
    			t3 = text("Click ");
    			a = element("a");
    			a.textContent = "here";
    			t5 = text(" for home");
    			document.title = "Booking";
    			attr_dev(h1, "class", "is-size-2");
    			add_location(h1, file$5, 6, 4, 113);
    			attr_dev(a, "href", "#/home");
    			attr_dev(a, "class", "has-text-success has-text-weight-bold");
    			add_location(a, file$5, 7, 14, 183);
    			add_location(h3, file$5, 7, 4, 173);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$5, 5, 2, 84);
    			attr_dev(div1, "class", "section");
    			add_location(div1, file$5, 4, 0, 59);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(h3, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Booking> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Booking", $$slots, []);
    	return [];
    }

    class Booking extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Booking",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\pages\contact.svelte generated by Svelte v3.20.1 */

    const file$6 = "src\\pages\\contact.svelte";

    function create_fragment$8(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let h1;
    	let t2;
    	let h3;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to the contact page";
    			t2 = space();
    			h3 = element("h3");
    			t3 = text("Click ");
    			a = element("a");
    			a.textContent = "here";
    			t5 = text(" for home");
    			document.title = "Contact";
    			attr_dev(h1, "class", "is-size-2");
    			add_location(h1, file$6, 6, 4, 113);
    			attr_dev(a, "href", "#/home");
    			attr_dev(a, "class", "has-text-success has-text-weight-bold");
    			add_location(a, file$6, 7, 14, 183);
    			add_location(h3, file$6, 7, 4, 173);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$6, 5, 2, 84);
    			attr_dev(div1, "class", "section");
    			add_location(div1, file$6, 4, 0, 59);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(h3, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Contact", $$slots, []);
    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\pages\faq.svelte generated by Svelte v3.20.1 */

    const file$7 = "src\\pages\\faq.svelte";

    function create_fragment$9(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let h1;
    	let t2;
    	let h3;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to the FAQ page";
    			t2 = space();
    			h3 = element("h3");
    			t3 = text("Click ");
    			a = element("a");
    			a.textContent = "here";
    			t5 = text(" for home");
    			document.title = "Booking";
    			attr_dev(h1, "class", "is-size-2");
    			add_location(h1, file$7, 6, 4, 107);
    			attr_dev(a, "href", "#/home");
    			attr_dev(a, "class", "has-text-success has-text-weight-bold");
    			add_location(a, file$7, 7, 14, 172);
    			add_location(h3, file$7, 7, 4, 162);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$7, 5, 2, 79);
    			attr_dev(div1, "class", "section");
    			add_location(div1, file$7, 4, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(h3, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Faq> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Faq", $$slots, []);
    	return [];
    }

    class Faq extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Faq",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\pages\notFound.svelte generated by Svelte v3.20.1 */

    const file$8 = "src\\pages\\notFound.svelte";

    function create_fragment$a(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let h1;
    	let t2;
    	let h3;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Awww did you get lost sweety?";
    			t2 = space();
    			h3 = element("h3");
    			t3 = text("Click ");
    			a = element("a");
    			a.textContent = "here";
    			t5 = text(" for home");
    			document.title = "Page not found";
    			attr_dev(h1, "class", "is-size-2");
    			add_location(h1, file$8, 6, 4, 114);
    			attr_dev(a, "href", "#/home");
    			attr_dev(a, "class", "has-text-success has-text-weight-bold");
    			add_location(a, file$8, 7, 14, 185);
    			add_location(h3, file$8, 7, 4, 175);
    			attr_dev(div0, "class", "container");
    			add_location(div0, file$8, 5, 2, 86);
    			attr_dev(div1, "class", "section");
    			add_location(div1, file$8, 4, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, h3);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(h3, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", $$slots, []);
    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\comps\nav.svelte generated by Svelte v3.20.1 */
    const file$9 = "src\\comps\\nav.svelte";

    function create_fragment$b(ctx) {
    	let nav;
    	let div3;
    	let div0;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let span3;
    	let span0;
    	let t1;
    	let span1;
    	let t2;
    	let span2;
    	let t3;
    	let div2;
    	let div1;
    	let a1;
    	let t5;
    	let a2;
    	let t7;
    	let a3;
    	let t9;
    	let a4;
    	let t11;
    	let a5;
    	let dispose;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div3 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			span3 = element("span");
    			span0 = element("span");
    			t1 = space();
    			span1 = element("span");
    			t2 = space();
    			span2 = element("span");
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			a1 = element("a");
    			a1.textContent = "Home";
    			t5 = space();
    			a2 = element("a");
    			a2.textContent = "About";
    			t7 = space();
    			a3 = element("a");
    			a3.textContent = "Booking";
    			t9 = space();
    			a4 = element("a");
    			a4.textContent = "Contact";
    			t11 = space();
    			a5 = element("a");
    			a5.textContent = "FAQ";
    			if (img.src !== (img_src_value = "https://bulma.io/images/bulma-logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "brand pic");
    			attr_dev(img, "width", "112");
    			attr_dev(img, "height", "28");
    			add_location(img, file$9, 9, 8, 355);
    			attr_dev(a0, "class", "navbar-item svelte-h9umq4");
    			attr_dev(a0, "href", "#/");
    			add_location(a0, file$9, 8, 6, 312);
    			attr_dev(span0, "aria-hidden", "true");
    			attr_dev(span0, "class", "svelte-h9umq4");
    			add_location(span0, file$9, 12, 8, 635);
    			attr_dev(span1, "aria-hidden", "true");
    			attr_dev(span1, "class", "svelte-h9umq4");
    			add_location(span1, file$9, 13, 8, 677);
    			attr_dev(span2, "aria-hidden", "true");
    			attr_dev(span2, "class", "svelte-h9umq4");
    			add_location(span2, file$9, 14, 8, 719);
    			attr_dev(span3, "role", "button");
    			attr_dev(span3, "class", "navbar-burger svelte-h9umq4");
    			attr_dev(span3, "aria-label", "menu");
    			attr_dev(span3, "aria-expanded", "false");
    			toggle_class(span3, "is-active", /*burgerActive*/ ctx[0]);
    			add_location(span3, file$9, 11, 6, 465);
    			attr_dev(div0, "class", "navbar-brand svelte-h9umq4");
    			add_location(div0, file$9, 7, 4, 278);
    			attr_dev(a1, "href", "#/");
    			attr_dev(a1, "class", "navbar-item svelte-h9umq4");
    			toggle_class(a1, "navActive", /*$location*/ ctx[2] == "/home" || /*$location*/ ctx[2] == "/");
    			add_location(a1, file$9, 19, 10, 922);
    			attr_dev(a2, "href", "#/about");
    			attr_dev(a2, "class", "navbar-item svelte-h9umq4");
    			toggle_class(a2, "navActive", /*$location*/ ctx[2] == "/about");
    			add_location(a2, file$9, 20, 10, 1034);
    			attr_dev(a3, "href", "#/booking");
    			attr_dev(a3, "class", "navbar-item svelte-h9umq4");
    			toggle_class(a3, "navActive", /*$location*/ ctx[2] == "/booking");
    			add_location(a3, file$9, 21, 10, 1133);
    			attr_dev(a4, "href", "#/contact");
    			attr_dev(a4, "class", "navbar-item svelte-h9umq4");
    			toggle_class(a4, "navActive", /*$location*/ ctx[2] == "/contact");
    			add_location(a4, file$9, 22, 10, 1238);
    			attr_dev(a5, "href", "#/faq");
    			attr_dev(a5, "class", "navbar-item svelte-h9umq4");
    			toggle_class(a5, "navActive", /*$location*/ ctx[2] == "/faq");
    			add_location(a5, file$9, 23, 10, 1343);
    			attr_dev(div1, "class", "navbar-end");
    			add_location(div1, file$9, 18, 6, 886);
    			attr_dev(div2, "class", "navbar-menu");
    			toggle_class(div2, "is-active", /*burgerActive*/ ctx[0]);
    			add_location(div2, file$9, 17, 4, 784);
    			attr_dev(div3, "class", "container is-flex-desktop");
    			add_location(div3, file$9, 6, 2, 233);
    			attr_dev(nav, "class", "navbar is-fixed-top svelte-h9umq4");
    			attr_dev(nav, "role", "navigation");
    			attr_dev(nav, "aria-label", "main navigation");
    			toggle_class(nav, "has-shadow", /*scrollY*/ ctx[1] > 0);
    			add_location(nav, file$9, 5, 0, 118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div3);
    			append_dev(div3, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img);
    			append_dev(div0, t0);
    			append_dev(div0, span3);
    			append_dev(span3, span0);
    			append_dev(span3, t1);
    			append_dev(span3, span1);
    			append_dev(span3, t2);
    			append_dev(span3, span2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, a1);
    			append_dev(div1, t5);
    			append_dev(div1, a2);
    			append_dev(div1, t7);
    			append_dev(div1, a3);
    			append_dev(div1, t9);
    			append_dev(div1, a4);
    			append_dev(div1, t11);
    			append_dev(div1, a5);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(span3, "click", /*click_handler*/ ctx[3], false, false, false),
    				listen_dev(div2, "click", /*click_handler_1*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*burgerActive*/ 1) {
    				toggle_class(span3, "is-active", /*burgerActive*/ ctx[0]);
    			}

    			if (dirty & /*$location*/ 4) {
    				toggle_class(a1, "navActive", /*$location*/ ctx[2] == "/home" || /*$location*/ ctx[2] == "/");
    			}

    			if (dirty & /*$location*/ 4) {
    				toggle_class(a2, "navActive", /*$location*/ ctx[2] == "/about");
    			}

    			if (dirty & /*$location*/ 4) {
    				toggle_class(a3, "navActive", /*$location*/ ctx[2] == "/booking");
    			}

    			if (dirty & /*$location*/ 4) {
    				toggle_class(a4, "navActive", /*$location*/ ctx[2] == "/contact");
    			}

    			if (dirty & /*$location*/ 4) {
    				toggle_class(a5, "navActive", /*$location*/ ctx[2] == "/faq");
    			}

    			if (dirty & /*burgerActive*/ 1) {
    				toggle_class(div2, "is-active", /*burgerActive*/ ctx[0]);
    			}

    			if (dirty & /*scrollY*/ 2) {
    				toggle_class(nav, "has-shadow", /*scrollY*/ ctx[1] > 0);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $location;
    	validate_store(location, "location");
    	component_subscribe($$self, location, $$value => $$invalidate(2, $location = $$value));
    	let { burgerActive } = $$props;
    	let { scrollY } = $$props;
    	const writable_props = ["burgerActive", "scrollY"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Nav", $$slots, []);

    	const click_handler = () => {
    		$$invalidate(0, burgerActive = !burgerActive);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(0, burgerActive = false);
    	};

    	$$self.$set = $$props => {
    		if ("burgerActive" in $$props) $$invalidate(0, burgerActive = $$props.burgerActive);
    		if ("scrollY" in $$props) $$invalidate(1, scrollY = $$props.scrollY);
    	};

    	$$self.$capture_state = () => ({
    		location,
    		burgerActive,
    		scrollY,
    		$location
    	});

    	$$self.$inject_state = $$props => {
    		if ("burgerActive" in $$props) $$invalidate(0, burgerActive = $$props.burgerActive);
    		if ("scrollY" in $$props) $$invalidate(1, scrollY = $$props.scrollY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [burgerActive, scrollY, $location, click_handler, click_handler_1];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { burgerActive: 0, scrollY: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*burgerActive*/ ctx[0] === undefined && !("burgerActive" in props)) {
    			console.warn("<Nav> was created without expected prop 'burgerActive'");
    		}

    		if (/*scrollY*/ ctx[1] === undefined && !("scrollY" in props)) {
    			console.warn("<Nav> was created without expected prop 'scrollY'");
    		}
    	}

    	get burgerActive() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set burgerActive(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scrollY() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scrollY(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.20.1 */
    const file$a = "src\\App.svelte";

    function create_fragment$c(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let updating_burgerActive;
    	let updating_scrollY;
    	let t0;
    	let div;
    	let t1;
    	let current;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[3]);

    	function nav_burgerActive_binding(value) {
    		/*nav_burgerActive_binding*/ ctx[4].call(null, value);
    	}

    	function nav_scrollY_binding(value) {
    		/*nav_scrollY_binding*/ ctx[5].call(null, value);
    	}

    	let nav_props = {};

    	if (/*burgerActive*/ ctx[0] !== void 0) {
    		nav_props.burgerActive = /*burgerActive*/ ctx[0];
    	}

    	if (/*scrollY*/ ctx[1] !== void 0) {
    		nav_props.scrollY = /*scrollY*/ ctx[1];
    	}

    	const nav = new Nav({ props: nav_props, $$inline: true });
    	binding_callbacks.push(() => bind(nav, "burgerActive", nav_burgerActive_binding));
    	binding_callbacks.push(() => bind(nav, "scrollY", nav_scrollY_binding));

    	const router = new Router({
    			props: { routes: /*routes*/ ctx[2] },
    			$$inline: true
    		});

    	const footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(nav.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			add_location(div, file$a, 38, 0, 952);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(router, div, null);
    			append_dev(div, t1);
    			mount_component(footer, div, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[3]();
    				}),
    				listen_dev(div, "click", /*click_handler*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*scrollY*/ 2 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*scrollY*/ ctx[1]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const nav_changes = {};

    			if (!updating_burgerActive && dirty & /*burgerActive*/ 1) {
    				updating_burgerActive = true;
    				nav_changes.burgerActive = /*burgerActive*/ ctx[0];
    				add_flush_callback(() => updating_burgerActive = false);
    			}

    			if (!updating_scrollY && dirty & /*scrollY*/ 2) {
    				updating_scrollY = true;
    				nav_changes.scrollY = /*scrollY*/ ctx[1];
    				add_flush_callback(() => updating_scrollY = false);
    			}

    			nav.$set(nav_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_component(router);
    			destroy_component(footer);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let burgerActive = false;
    	let scrollY = 0;

    	const routes = {
    		"/": Home,
    		"/home": Home,
    		"/about": About,
    		"/booking": Booking,
    		"/contact": Contact,
    		"/faq": Faq,
    		"*": NotFound
    	};

    	navigator.serviceWorker.ready.then(function (registration) {
    		registration.showNotification("Vibration Sample", {
    			body: "Buzz! Buzz!",
    			icon: "/assets/park.png",
    			vibrate: [200, 100, 200, 100, 200, 100, 200],
    			tag: "/#/about"
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function onwindowscroll() {
    		$$invalidate(1, scrollY = window.pageYOffset);
    	}

    	function nav_burgerActive_binding(value) {
    		burgerActive = value;
    		$$invalidate(0, burgerActive);
    	}

    	function nav_scrollY_binding(value) {
    		scrollY = value;
    		$$invalidate(1, scrollY);
    	}

    	const click_handler = () => {
    		$$invalidate(0, burgerActive = false);
    	};

    	$$self.$capture_state = () => ({
    		Router,
    		Home,
    		About,
    		Booking,
    		Contact,
    		Faq,
    		NotFound,
    		Nav,
    		Footer,
    		burgerActive,
    		scrollY,
    		routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("burgerActive" in $$props) $$invalidate(0, burgerActive = $$props.burgerActive);
    		if ("scrollY" in $$props) $$invalidate(1, scrollY = $$props.scrollY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		burgerActive,
    		scrollY,
    		routes,
    		onwindowscroll,
    		nav_burgerActive_binding,
    		nav_scrollY_binding,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
