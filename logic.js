/*
 * LOGIC LIBRARY
 *
 * ©2016.
 */

"use strict";

(function() {

    let database = [];
    let termID = 0;

    // symbols for special properties
    // use a leading underscore for values, but a leading $ for methods
    const _id = Symbol("id");
    const _type = Symbol("type");
    const _args = Symbol("args");
    const _body = Symbol("body");
    const $match = Symbol("match()");
    const $substitute = Symbol("substitute()");
    const $query = Symbol("query()");
    // type enums
    const VARIABLE = Symbol("Variable"); 
    const TERM = Symbol("Term");
    const RULE = Symbol("Rule");
    const CONJUNCTION = Symbol("Conjunction");

    /*
     * CONSTRUCTORS
     */

    /**
     * Add logic functionality to an object, or create a new object with
     * logic functionality. This function creates a term object.
     * @param {*} arg1 either the object to wrap, or a primitive ID.
     * @param {*} arg2 a primitive ID, if an object was passed to arg1.
     * @returns {Term} a logic term object. The object is a modified version of 
     * the object that was passed in, not a separate copy.
     *
     * @example
     * <caption>
     *   The constructor may be called without any arguments, in which case the
     *   term is assigned an internal, hidden identifier:
     * </caption>
     * let term = T();
     *
     * @example
     * <caption>
     *   It may also be called with a single primitive argument, which will be
     *   used as the term's identifier:
     * </caption>
     * let term_1 = T("term 1");
     * let term_2 = T(2);
     * let term_3 = T(Symbol("term 3"));
     *
     * @example
     * <caption>
     *   The constructor may also be called with an object to wrap, and an
     *   optional identifier.  If no identifier is passed, a hidden default
     *   will be used, as above.
     * </caption>
     * let person = {
     *     first_name: "John",
     *     last_name: "Doe"
     * };
     * let term_1 = T(person, "John Doe");
     * let term_2 = T(person); // hidden identifier
     *
     * @example
     * <caption>
     *   The function returns the constructed term, which has two methods
     *   attached to create compound terms.  The methods, has() and is(),
     *   operate the same way.  If the object passed to this constructor
     *   already has properties 'has' and 'is,' they will be backed up to
     *   '_has' and '_is.' Compound terms are created by calling either has()
     *   or is() with an identifier.  Further terms can be appedned to the end
     *   as well.
     * </caption>
     * let john = T("john");
     * let robert = T("robert");
     *
     * john.is("a person");
     * robert.has("father")(john);
     */
    window.T = function(arg1, arg2) {
        let obj, id;
        // nothing passed, use number as ID and make empty object
        if (!arg1) { 
            obj = {};
            id = termID++;
        }  // object passed, so wrap it
        else if (typeof arg1 === "object" || typeof arg1 === "function") {
            // back up properties that will be overwritten
            obj = arg1;
            if ("is" in obj) 
                obj._is = obj.is;
            if ("has" in obj)
                obj._has = obj.has;

            // use label if passed, otherwise use generic ID
            id = arg2 || termID++; 
        } // no object passed, use empty object and provided ID
        else { 
            obj = {};
            id = arg1;
        }

        obj[_id] = id;
        obj[_type] = TERM;
        obj[_args] = []; // no args for basic term
        obj[$match] = term_match.bind(obj);
        obj[$substitute] = term_substitute.bind(obj);
        // helper functions to create compound terms
        obj.has = makeCompoundTerm.bind(null, "has ", obj); 
        obj.is = makeCompoundTerm.bind(null, "is ", obj);
        // and toString function
        obj.toString = term_toString.bind(obj);

        return obj;
    };

    // match two terms to each other, returning a map of the bindings
    // between terms and variables
    let term_match = function(other) {
        if (other[_type] === RULE || other[_type] === TERM) {
            // make sure the terms match in ID
            if (this[_id] !== other[_id]) return false;
            // make sure the terms match in arity
            if (this[_args].length !== other[_args].length) return false;

            // return the set of bindings from matching each argument
            return this[_args].map(
                (arg, i) => arg[$match]( other[_args][i] )
            ).reduce(mergeBindings, new Map()); // combine all the bindings for each argument into one big map
        } else { // a variable, so bind it to this
            return other[$match](this);
        }
    };

    // substitute variables in the term for their bound values
    let term_substitute = function(bindings) {
        let term = copyTerm(this);
        term[_args] = term[_args].map(arg => arg[$substitute](bindings));
        return term;
    };

    let term_toString = function() {
        if (this[_args].length === 0) 
            return this[_id].toString();
        else {
            let str = this[_args][0][_id] + 
                " " + this[_id] + " " + 
                this[_args].slice(1).map(a => a[_id]).join(" ");
            return str.trim();
        }
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
            [$match]: term_match,
            [$substitute]: term_substitute,
            toString: term_toString,
        };

        return function(...new_args) {
            new_args = new_args.map(ensureValid); // make sure they are all valid
            term[_args].push(...new_args);

            return term;
        };         
    };

    /**
     * Add logic functionality to an object, or create a new object with
     * logic functionality.  This function creates a variable object.
     * @param {*} arg1 either the object to wrap, or a primitive ID.
     * @param {*} arg2 a primitive ID, if an object was passed to arg1.
     * @returns {Variable} a logic term object. 
     *
     * This constructor operates in the same way as {@link T} above.  Compound
     * terms can be created in the same way as well.
     */
    window.V = function(arg1, arg2) {
        let obj = self.T(arg1, arg2);
        obj[_type] = VARIABLE;
        // change match and substitute functions
        obj[$match] = variable_match.bind(obj);
        obj[$substitute] = variable_substitute.bind(obj);

        return obj;
    };

    // bind a term to a variable
    let variable_match = function(other) {
        let bindings = new Map();
        if (this !== other) { // if the two objects aren't exactly the same
           bindings.set(this, other); 
        }

        return bindings;
    };

    // Substitute this variable with its bound value
    let variable_substitute = function(bindings) {
        let value = bindings.get(this); // get the term/var associated with this variable
        if (value) { // if something is bound to this, return it, substituted
            return value[$substitute](bindings);
        } else { // otherwise just return this variable
            return this;
        }
    };


    // register rules in DB TODO write doc
    /*
     * Registers a set of terms in the terms database.
     */
    window.given = function(...args) {
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
                        term[$substitute] = rule_substitute.bind(term);
                        term[_body] = {
                            [_args]: predicates.slice(),
                            [_type]: CONJUNCTION,
                            [$substitute]: term_substitute,
                        };
                        term.toString = rule_toString.bind(term);
                        database.push(term);
                    }

                    return args;
                } else { // single object
                    let term = args[0];
                    // turn term into rule
                    term[_type] = RULE;
                    term[_body] = {
                        [_args]: predicates,
                        [_type]: CONJUNCTION,
                        [$substitute]: term_substitute,
                    };
                    term[$substitute] = rule_substitute.bind(term);
                    term.toString = rule_toString.bind(term);
                    database.push(term);

                    return term;
                }

            },
        };
    };

    let rule_substitute = function(bindings) {
        let newRule = copyTerm(this);
        // substitute the rule head
        newRule[_args] = newRule[_args].map(arg => arg[$substitute](bindings));
        // and body
        newRule[_body][_args] = newRule[_body][_args].map(term => term[$substitute](bindings));

        return newRule;
    };

    let rule_query = function * (term, bindings) { 
        let rule = term[$substitute](bindings);
        let body = rule[_body];
        for (var match of conjunction_query(body)) { 
            // yield this rule, substituted with any matching terms
            yield match;
            rule[$substitute](match);
        }
    };

    let rule_toString = function() {
        let str = "if ";
        // add each predicate
        str += this[_body][_args].map(a => a.toString()).join(", and ");
        str += ", then " + term_toString.call(this); // add conclusion

        return str.trim();
    };

    let conjunction_match = function(other) {
        if (other[_type] === CONJUNCTION) {
            // make sure the terms match in arity
            if (this[_args].length !== other[_args].length) return false;

            // return the set of bindings from matching each argument
            return this[_args].map(
                (arg, i) => arg[$match]( other[_args][i] )
            ).reduce(mergeBindings, new Map()); // combine the bindings of each argument into one big Map
        } else { // a variable, so bind it to this
            return other[$match](this);
        }
    };

    let conjunction_query_2 = function * (term) {
        let bindings = new Map();

        // for every subterm in conjunction
        let length = term[_args].length;
        for (let i = 0; i < length; i++) {
            let arg = term[_args][i];
            // for every match with this argument
            for (let match of query(arg[$substitute](bindings)) ) { 
                let unified = mergeBindings(match, bindings); 
                // return if unable to merge bindings
                if (unified) {
                    bindings = unified;
                }
            }
        }

        yield bindings;
    };

    let conjunction_query = function * (term) {
        let solutions = function * (i, bindings) {
            let arg = term[_args][i];
            if (!arg) {
                yield bindings;
            } else {
                for (let match of query(arg[$substitute](bindings)) ) {
                    let unified = mergeBindings(match, bindings);
                    if (unified) {
                        yield* solutions(i + 1, unified);
                    }
                }
            }
        }

        yield* solutions(0, new Map());
    }


    
    /*
     * GLOBAL FUNCTIONS
     */

    // given two Maps, merge them together
    let mergeBindings = function(bindings1, bindings2) {
        if (!bindings1 || !bindings2) return null; // both have to be there

        let conflict = false;
        let merged = new Map();

        // copy bindings1 over to merged
        bindings1.forEach((value, variable) => merged.set(variable, value));

        bindings2.forEach((value, variable) => {
            let other = merged.get(variable); // get value in bindings1

            if (other) {
                let bindings = other[$match](value); // see if the two can be matched
                if (!bindings) { // no unification possible -> CONFLICT
                    conflict = true;
                } else { // two bindings can be unified
                    bindings.forEach( // copy over the new bindings to merged
                        (value, variable) => merged.set(variable, value)
                    );
                }
            } else { // no matching variable in bindings1, so copy over
                merged.set(variable, value);
            }
        });

        if (conflict)
            return null;
        else
            return merged;
    };

    // register terms in DB TODO write doc
    window.terms = function(...args) { // args should be an array of IDs
        // convert any unfinished compound terms builders in to proper terms
        args = args.map(ensureValid);
        database.push(...args);

        return database;
    };

    window.query = function * (goal) {
        goal = ensureValid(goal); 
        // try matching to every saved term
        for (var term of database) { 
            let match = term[$match](goal);
            if (!match) continue;


            if (term[_type] === TERM) {
                match.substitute = () => goal[$substitute](match);
                yield match;
            } else if (term[_type] === RULE) {
                let bindings = [...rule_query(term, match)];
                for (let b of bindings) {
                    b.substitute = () => goal[$substitute](b);
                }

                yield* bindings;
            }
        } 
    };

    window.does = function(term) {
        return {
            have: function(label) {
                let compound = makeCompoundTerm("has ", term, label)();

                return function(...new_args) {
                    new_args = new_args.map(ensureValid); // make sure all good
                    compound[_args].push(...new_args);
                    let answer = [...query(compound)];
                    return answer.length > 0;
                };
            },
        };
    };

    window.is = function(term) {
        return function(label) {
            let compound = makeCompoundTerm("is ", term, label)();

            return function(...new_args) {
                new_args = new_args.map(ensureValid); // make sure all good
                compound[_args].push(...new_args);
                let answer = [...query(compound)];
                return answer.length > 0;
            };
        };
    };


    /*
     * HELPER FUNCTIONS
     */

    // ensures an object is a valid logic term, rule, or variable
    let ensureValid = function(obj) {
        if (typeof obj === "function") // if term is partial, complete it
            obj = obj();

        // ensure it is the right type
        if (!(_id in obj) || !(_type in obj)) {
            throw new Error(`Expected a valid logic object, but instead got ${obj}`);
        }

        return obj;
    }

    // creates a copy of a given term
    let copyTerm = function(term) {
        let newTerm = {};
        for (let prop in term) {
            newTerm[prop] = term[prop];
        }

        // copy over other properties
        newTerm[_id] = term[_id];
        newTerm[_type] = term[_type];
        newTerm[_args] = term[_args].slice();
        if (term[_body]) {
            newTerm[_body] = copyTerm(term[_body]); // recursively copy conjunction
        }
        newTerm[$match] = term_match.bind(newTerm);
        newTerm[$substitute] = term_substitute.bind(newTerm);

        return newTerm;
    };


    // TODO delete
    window._db = database;
    window.$s = $substitute;
    window.$m = $match;
    window._id = _id;
    window._type = _type;
    window._args = _args;
    window._body = _body;
    window._TRM = TERM;
    window._VAR = VARIABLE
    window._RUL = RULE;
    window._CNJ = CONJUNCTION;
    window.logic_reset = function() {
        database = [];
    };

})();
