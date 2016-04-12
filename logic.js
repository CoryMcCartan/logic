/*
 * LOGIC LIBARY
 *
 * ©2016.
 */

"use strict";

window.logic = (function() {
    let self = {};

    let program, termID;
    let bindings = new Map();

    // helper function for testing TODO write doc
    self.reset = function() {
        program = [];
        termID = 0;
        bindings.clear();
    };
    self.reset();

    // symbols for logic properties
    const _id = Symbol("id");
    const _type = Symbol("type");
    const _args = Symbol("args");
    const _body = Symbol("body");
    // type enums
    const VARIABLE = Symbol("Variable"); 
    const TERM = Symbol("Term");
    const RULE = Symbol("Rule");


    /*
     * IMPLEMENTATION LOGIC
     */

    // unificiation algorithm
    let unify = function(obj1, obj2) {
        let failed = false;

        if (obj1 !== obj2) { // not pointing to the same thing
            // if either is an unbound variable, bind it to the other 
            if (obj1[_type] === VARIABLE || obj2[_type] === VARIABLE) {
                bind(obj1, obj2);
            } // both are terms which need to be unified 
            else if (obj1[_type] === TERM && obj2[_type] === TERM){
                if (obj1[_id] === obj2[_id]  // same ID
                        && obj1[_args].length === obj2[_args].length) { // and same arity
                    // recursively unify each argument 
                    let arity = obj1[_args].length;
                    for (let i = 0; i < arity; i++) {
                        failed |= !unify(obj1[_args][i], obj2[_args][i]); 
                    }
                } else {
                    failed = true;
                }
            } // if both are rules, also unify
            else if (obj1[_type] === RULE && obj2[_type] === RULE) {
                if (obj1[_id] === obj2[_id]  // same ID
                        && obj1[_args].length === obj2[_args].length) { // and same arity
                    // unify and substitute head terms
                    let arity = obj1[_args].length;
                    for (let i = 0; i < arity; i++) {
                        failed |= !unify(obj1[_args][i], obj2[_args][i]); 
                    }
                    // then substitute

                } else {
                    failed = true;
                }
            } else { // some sort of mismatch
                failed = true;
            }
        }

        return !failed;
    };

    // make an unbound variable point to a term
    let bind = function(obj1, obj2) {
        // determine which is the unbound variable
        if (obj1[_type] === VARIABLE && !bindings.has(obj1)) { // obj1 unbound
            bindings.set(obj1, obj2);
        } else if (obj2[_type] === VARIABLE && !bindings.has(obj2)) { // obj2 unbound
            bindings.set(obj2, obj1);
        } else { // both bound
            throw new Error("Unable to bind: both objects bound");
        }
    }

    // query something TODO write doc
    self.query = function(term) {
        term = ensureValid(term);

        let finalBindings = new QueryResult(term);
        let matched = false;

        for (let test_term of program) {
            bindings.clear();
            if (unify(test_term, term)) {
                // add successful bindings to list of all successful bindings
                finalBindings.push(new Map(bindings)); // make copy of bindings
                matched = true;
            }
        } 

        // simple match, no bindings
        if (finalBindings.length === 1 && finalBindings[0].size === 0) {
            finalBindings = true;
        }

        return matched ? finalBindings : false;
    };

    let substitute = function(obj, bindings) {
        switch (obj[_type]) {
            case VARIABLE:
                let value = bindings.get(obj);
                if (value) {
                    // if value is compound term, substitute it, too.
                    return substitute(value, bindings);
                } else {
                    return obj;
                }
                break;
            case TERM:
            case RULE:
                let newTerm = copyTerm(obj);
                newTerm[_args] = newTerm[_args].map(a => substittue(a, bindings));
                return newTerm;
                break;
        } 
    };



    /*
     * USER FUNCTIONS
     */

    // make term TODO write doc
    self.T = function(arg1, arg2) {
        let obj, id;
        if (!arg1) { // nothing passed, use number as ID and make empty object
            obj = {};
            id = termID++;
        } else if (typeof arg1 === "object" || typeof arg1 === "function") { // object passed
            // back up properties that will be overwritten
            obj = arg1;
            if ("is" in obj) 
                obj._is = obj.is;
            if ("has" in obj)
                obj._has = obj.has;

            // use label if passed, otherwise use generic ID
            id = arg2 || termID++; 
        } else { // other ID
            obj = {};
            id = arg1;
        }

        obj[_id] = id;
        obj[_type] = TERM;
        obj[_args] = []; // no args for basic term
        obj.has = makeCompoundTerm.bind(null, "has ", obj); 
        obj.is = makeCompoundTerm.bind(null, "is ", obj);

        return obj;
    };

    // makes a function to generate compound terms
    let makeCompoundTerm = function(joiner, caller, label) {
        let id = joiner + label;
        caller = ensureValid(caller);

        let term = {
            [_id]: id,
            [_type]: TERM,
            [_args]: caller ? [ // if no caller passed, then init empty array
                caller,
            ] : [],
        };

        return function(...new_args) {
            new_args = new_args.map(ensureValid); // make sure they are all valid
            term[_args].push(...new_args);

            return term;
        };         
    };

    // make variable TODO write doc
    self.V = function(arg1, arg2) {
        let obj = self.T(arg1, arg2);
        obj[_type] = VARIABLE;

        return obj;
    };

    // register terms in DB TODO write doc
    self.terms = function(...args) { // args should be an array of IDs
        // convert any unfinished compound terms builders in to proper terms
        args = args.map(ensureValid);
        program.push(...args);

        return program;
    };

    // register rules in DB TODO write doc
    self.given = function(...args) {
        args = args.map(ensureValid);
        let predicates = [...args];

        return {
            and(...args) {
                args = args.map(ensureValid);

                predicates.push(...args);
                return this; // return same object for further chaining
            },
            then(...args) {
                args = args.map(ensureValid);

                if (args.length > 1) { // multiple objects
                    // multiple terms case falls through to here
                    for (let term of args) {
                        // turn term into rule
                        term[_type] = RULE; 
                        term[_body] = predicates.slice();
                        program.push(term);
                    }

                    return args;
                } else { // single object
                    let term = args[0];
                    // turn term into rule
                    term[_type] = RULE;
                    term[_body] = predicates;
                    program.push(term);

                    return term;
                }

            },
        };
    };

    // syntactic sugar for query 
    self.does = function(term) {
        return {
            have: function(label) {
                let compound = makeCompoundTerm("has ", term, label)();

                return function(...new_args) {
                    new_args = new_args.map(ensureValid); // make sure all good
                    compound[_args].push(...new_args);
                    return self.query(compound);
                };
            },
        };
    };

    // syntactic sugar for query 
    self.is = function(term) {
        return function(label) {
            let compound = makeCompoundTerm("is ", term, label)();

            return function(...new_args) {
                new_args = new_args.map(ensureValid); // make sure all good
                compound[_args].push(...new_args);
                return self.query(compound);
            };
        };
    };

    let QueryResult = class extends Array {
        constructor(term) {
            super();
            this.term = term;
        }

        toString() {
            let all = []; // array of all string results
            let id = this.term[_id];
            let length = this.term[_args].length;

            for (let binding of this) {
                // substitute bindings
                let t = this.term[_args].slice();

                for (let i = 0; i < length; i++) { 
                    t[i] = substitute(t[i], binding);
                }

                let first = t[0][_id];
                let rel = id;
                let others = t.slice(1).map(x => x[_id]).join(" and ");
                all.push([first, rel, others].join(" "));
            }

            return all.join("\n");
        }
    };



    /*
     * HELPER FUNCTIONS
     */

    let ensureValid = function(obj) {
        if (typeof obj === "function") // if term is partial, complete it
            obj = obj();

        // ensure it is the right type
        if (!(_id in obj) || !(_type in obj)) {
            throw new Error(`Expected a valid logic object, but instead got ${obj}`);
        }

        return obj;
    }

    let copyTerm = function(term) {
        let newTerm = {};
        for (let prop in term) {
            newTerm[prop] = term[prop];
        }

        // copy over other properties
        newTerm[_id] = term[_id];
        newTerm[_type] = TERM;
        newTerm[_args] = term[_args].slice();

        return newTerm;
    };

    

    // TODO remove
    window._p = program;
    window._id = _id;
    window._args = _args;
    window._type = _type;
    window._body = _body;
    window._VAR = VARIABLE;
    window._TRM = TERM;
    window._RUL = RULE;

    return self;
})();

