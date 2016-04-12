(function() {
    "use strict";

    var mergeBindings = function(bindings1, bindings2) {
        if (!bindings1 || !bindings2) {
            return null;
        }
        var conflict = false;
        var bindings = new Map;
        
        bindings1.forEach(function(value, variable) {
            bindings.set(variable, value);
        });

        bindings2.forEach(function(value, variable) {
            var other = bindings.get(variable);
            if (other) {
                var sub = other.match(value);
                if (!sub) {
                    conflict = true;
                } else {
                    sub.forEach(function(value, variable) {
                        bindings.set(variable, value);
                    });
                }
            } else {
                bindings.set(variable, value);
            }
        });

        if (conflict) {
            return null;
        } else {
            return bindings;
        }
    };

    class Variable {
        constructor(name) {
            this.name = name;
        }

        match(other) {
            var bindings = new Map;
            if (this !== other) {
                bindings.set(this, other);
            }
            return bindings;
        }

        substitute(bindings) {
            var value = bindings.get(this);
            if (value) {
                // if value is a compound term then substitute
                // variables inside it too
                return value.substitute(bindings);
            }
            return this;
        }
    }

    class Term {
        constructor(functor, args) {
            this.functor = functor;
            this.args = args || [];
        }

        match(other) {
            if (other instanceof Term) {
                if (this.functor !== other.functor) {
                    return null;
                }
                if (this.args.length !== other.args.length) {
                    return null;
                }
                return zip([this.args, other.args]).map(function(args) {
                    return args[0].match(args[1]);
                }).reduce(mergeBindings, new Map);
            }
            return other.match(this);
        }

        substitute(bindings) {
            return new Term(this.functor, this.args.map(function(arg) {
                return arg.substitute(bindings);
            }));
        }

    }

    Term.prototype.query = function*(database) {
        yield* database.query(this); 
    };

    function zip(arrays) {
        return arrays[0].map(function(element, index) {
            return arrays.map(function(array) {
                return array[index];
            });
        });
    }

    Term.TRUE = new Term('true');

    Term.TRUE.substitute = function() {
        return this;
    };

    Term.TRUE.query = function*() {
        yield this;
    };


    class Rule {
        constructor(head, body) {
            this.head = head;
            this.body = body;
        }
    }

    class Conjunction extends Term {
        constructor(args) {
            this.args = args;
        }

        substitute(bindings) {
            return new Conjunction(this.args.map(function(arg) {
                return arg.substitute(bindings);
            }));
        }
    }

    Conjunction.prototype.query = function*(database) {
        var self = this;
        function* solutions(index, bindings) {
            var arg = self.args[index];
            if (!arg) {
                yield self.substitute(bindings);
            } else {
                for (var item of database.query(arg.substitute(bindings))) {
                    var unified = mergeBindings(arg.match(item), bindings);
                    if (unified) {
                        yield* solutions(index + 1, unified);
                    }
                }
            }
        }
        yield* solutions(0, new Map);
    };

    class Database {
        constructor(rules) {
            this.rules = rules;
        }   
    }

    Database.prototype.query = function*(goal) {
        for (var i = 0, rule; rule = this.rules[i]; i++) {
            var match = rule.head.match(goal);
            if (match) {
                var head = rule.head.substitute(match);
                var body = rule.body.substitute(match);
                for (var item of body.query(this)) {
                    yield head.substitute(body.match(item));
                }
            }
        }
    };


    Variable.prototype.toString = function() {
        return this.name;
    };

    Term.prototype.toString = function() {
        if (this.args.length === 0) {
            return this.functor;
        }
        return this.functor + '(' + this.args.join(', ') + ')';
    };

    Rule.prototype.toString = function() {
        return this.head + ' :- ' + this.body;
    };

    Conjunction.prototype.toString = function() {
        return this.args.join(', ');
    };

    Database.prototype.toString = function() {
        return this.rules.join('.\n') + '.';
    };

    window.V = Variable;
    window.T = Term;
    window.R = Rule;
    window.C = Conjunction;
    window.DB = Database;
})();

