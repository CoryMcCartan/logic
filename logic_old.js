/*
 * LOGIC LIBRARY
 *
 * ©2016.
 */

(function() {
    "use strict";

    let counter = 0; // for IDs

    let terms = {};

    window._terms = terms; // TODO remove

    // Term registration
    window.T = new Proxy(terms, {
        get(target, name) {
            if (!(name in target)) {
                target[name] = new Term(name);
            }

            return makeTermAccumulator(name);
        },    
    });
    // Variable registration
    window.V = new Proxy(terms, {
        get(target, name) {
            if (!(name in target)) {
                target[name] = new Variable(name);
            }

            return makeTermAccumulator(name);
        },
    });

    class Term {
        constructor(name, args, premises) {
            this.id = name;
            this.args = args || [];
            this.premises = premises || [];
        }

        [Symbol.toPrimitive]() {
            if (!(this.id in terms)) return false; // check that term exists
            let registered = terms[this.id];
            let myterms = this.args[0];
            let numArgs = myterms.length;

            if (registered.value !== undefined) { // variable
                return true;
            } else if (registered.args.length === 0) { // simple term
                return true;
            } else if (registered.premises.length === 0) { // compound term
                // run through args of matching term and check if this one equals the others
                for (let args of registered.args) {
                    if (args.length !== numArgs) continue;

                    let match = true;
                    // ensure every argument matches
                    for (let i = 0; i < numArgs; i++) {
                        if (myterms[i] instanceof Variable) {
                            continue;
                        } else if (args[i] !== myterms[i]) {
                            match = false;
                            break;
                        }
                    } 

                    if (match) return true;
                }

                return false;
            } else { // rule
                // match args to variables
                let bindings = new Map();
                let vars = registered.args[0];

                for (let i = 0; i < numArgs; i++) {
                    bindings.set(vars[i], myterms[i]);
                }

                for (let premise of registered.premises) {
                    // generate new term with substituted variables
                    let argsCopy = premise.args.slice(0)[0];
                    argsCopy.forEach((arg, i) => {
                        argsCopy[i] = bindings.get(arg) || arg;
                    });

                    // evaluate and recurse
                    let testTerm = new Term(premise.id, [argsCopy], 
                                            premise.premises);
                    if (!+testTerm) {
                        return false;
                    }
                }

                return true; 
            }
        }
    }

    class Variable {
        constructor(name) {
            this.id = name;
            this.value = null;
        }
    }

    let makeTermAccumulator = function(name) {
        let self = this;

        let term = terms[name];

        // generates complete horn clause
        let newterm = function() {
            return new Term("", [[term]]);
        }

        let proxy = new Proxy(newterm(), {
            // compound term registration
            get(target, name) {
                if (name in target) return target[name]; // ignore default properties
                if (name === "__term__") return term; 
                if (name === "splice") return;  // splice is called by js engine
                if (name === "value") return;  // value is property of Variable

                target.id += "|" + name;

                return function(...args) {
                    args = args.map(x => x.__term__); // get term from each proxy
                    target.args[0].push(...args);
                    return proxy;
                };
            },
        });

        return proxy;
    };

    let Rule = function() {
    };

    let given = function(term_1) {
        let premises = [term_1];

        let obj = {
            and: function(term_2) {
                premises.push(term_2); 
                return obj;
            },
            then: function(term_3) {
                terms[term_3.id] = new Term(term_3.id, term_3.args, premises);
            },
        };

        return obj;
    };

    window.given = given;

    window.terms = function(...args) {
        for (let term of args) {
            if (!(term.id in terms)) {
                terms[term.id] = term;
            } else {
                terms[term.id].args.push(...term.args);
                for (let premise of term.premises) {
                    terms[premise.id].args.push(...premise.args);
                }
            }
        } 
    };


    window.__ = T.__;

})();
