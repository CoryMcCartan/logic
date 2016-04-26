var should = chai.should();

let SymCheck = function(s) {
    return function(t) {
        return t[Symbol.toPrimitive]() === s;
    };
};

describe("logic", function() {
    this.timeout(0); // don't timeout


    afterEach(function() {
        logic_reset();
    });

    describe("T()", function() {
        it("should create a term", function() {
            let t = T("term");        
            t["is"].should.be.a("function");
            t["has"].should.be.a("function");
            t[_id].should.equal("term");
            t[_args].should.be.empty;
            t[_type].should.satisfy(SymCheck(_TRM));
        });
        it("should accept any primitive type as an ID", function() {
            let sym = Symbol("1");

            let t1 = T(1);  
            let t2 = T("1");
            let t3 = T(sym);

            t1[_id].should.equal(1);
            t2[_id].should.equal("1");
            t3[_id].should.satisfy(SymCheck(sym));
        });
        it("should safely backup overwritten properties", function() {
            let t = {is: 1, has: 2};
            T(t);

            t["is"].should.be.a("function");
            t["has"].should.be.a("function");
            t["_is"].should.equal(1);
            t["_has"].should.equal(2);
        });
        it("should allow chaining to create a compound term", function() {
            let t1 = T("1");
            let t2 = T("2");
            let t3 = T("2");

            let r1 = (t1).has("rel to")(t2);
            let r2 = (t1).is("related to")(t2, t3);

            r1[_id].should.equal("has rel to");
            r1[_type].should.satisfy(SymCheck(_TRM));
            r1[_args].should.have.lengthOf(2);
            r1[_args][0].should.equal(t1);
            r1[_args][1].should.equal(t2);

            r2[_id].should.equal("is related to");
            r2[_type].should.satisfy(SymCheck(_TRM));
            r2[_args].should.have.lengthOf(3);
            r2[_args][0].should.equal(t1);
            r2[_args][1].should.equal(t2);
            r2[_args][2].should.equal(t3);
        });
    }); 

    describe("V()", function() {
        it("should create a variable", function() {
            let v = V("var");        
            v[_type].should.satisfy(SymCheck(_VAR));
        });
    }); 

    describe("facts()", function() {
        it("should take terms as arguments", function() {
            let t1 = T("1");
            let t2 = T("2");
            let r = t1.has("rel to")(t2);

            let p = facts(t1, t2, r); 
            p.should.be.a("Set");
            p.size.should.equal(3);
            p.should.deep.equal(new Set([t1, t2, r]));
        });
        it("should convert partially completed terms to full terms", function() {
            let t = T(1);
            let r = t.is("thing");
            r.should.be.a("function");

            let p = facts(r);
            p.has(r()).should.be.true;
        });
        it("should throw an error for invalid terms", function() {
            let badTerm = 3.1415926535;
            let test = facts.bind(null, badTerm);  

            test.should.throw(Error);
        });
    });

    describe("query()", function() {
        it("should return true for any term already in program", function() {
            let t1 = T(1);
            let t2 = T(2);

            facts(
                (t1).has("rel to")(t2)
            );

            let answer = query(
                (t1).has("rel to")(t2)
            );

            answer.should.not.be.false;
        });
        it("should not allow commutative relationships", function() {
            let t1 = T(1);
            let t2 = T(2);

            facts(
                (t1).has("rel to")(t2)
            );

            let answer = [...query(
                (t2).has("rel to")(t1)
            )];

            answer.should.have.length(0);
        });
        it("should fail for a compound term that does not exist", function() {
            let t1 = T(1);
            let t2 = T(2);

            let answer = [...query(
                (t1).has("rel to")(t2)
            )];

            answer.should.have.length(0);
        })
        it("should bind a single variable to the correct term", function() {
            let t1 = T(1);
            let t2 = T(2);
            let X = V("X");

            facts(
                (t1).has("rel to")(t2)
            );

            let answer1 = [...query(
                (X).has("rel to")(t2)
            )];
            let answer2 = [...query(
                (t1).has("rel to")(X)
            )];

            answer1.should.be.an("array");
            answer1.should.have.lengthOf(1);
            answer1[0].should.be.an("map");
            answer1[0].get(X).should.equal(t1);

            answer2.should.be.an("array");
            answer2.should.have.lengthOf(1);
            answer2[0].should.be.an("map");
            answer2[0].get(X).should.equal(t2);
        });
        it("should fail to bind a variable if no unification exists", function() {
            let t1 = T(1);
            let t2 = T(2);
            let X = V("X");

            facts(
                (t1).has("rel to")(t2)
            );

            let answer1 = [...query(
                (X).has("rel to")(t1)
            )];
            let answer2 = [...query(
                (t2).has("rel to")(X)
            )];

            answer1.should.have.length(0);
            answer2.should.have.length(0);
        });
        it("should produce a list of multiple bindings, if possible", function() {
            let t1 = T(1);
            let t2 = T(2);
            let X = V("X");
            let Y = V("X");

            facts(
                (t1).has("rel to")(t2),
                (t2).has("rel to")(t1)
            );

            let answer = [...query(
                (X).has("rel to")(Y)
            )];

            answer.should.be.an("array");
            answer.should.have.lengthOf(2);
            answer[0].get(X).should.equal(t1);
            answer[0].get(Y).should.equal(t2);
            answer[1].get(X).should.equal(t2);
            answer[1].get(Y).should.equal(t1);
        });
        it("should allow partially completed terms", function() {
            let t = T();
            facts(t.is("a thing"));

            let answer = [...query(t.is("a thing"))];

            answer.should.not.have.length(0);
        })
        it("should throw an error for invalid terms", function(done) {
            let badTerm = 3.1415926535;
            let test = query.bind(null, badTerm);  

            try {
                [...test()];
                throw new Error("Expected test to throw an error");
            } catch (e) {
                done();
            }
        });
        it("should return true for rule if predicates are met", function() {
            let t1 = T(1);
            let t2 = T(2);

            let X = V(), Y = V();

            facts(
                t1.is("child to")(t2)
            );

            given(
                X.is("child to")(Y)
            ).then(
                Y.is("parent to")(X)
            );

            let answer = [...query(t2.is("parent to")(t1))];

            answer.should.not.have.length(0);
        });

        describe("toString()", function() {
            it("should print out all matching sentences", function() {
                let robert = T("robert");
                let sally  = T("sally");
                let lisa   = T("lisa");
                let john   = T("john");
                let sue    = T("sue");
                let bill   = T("bill");
                let jane   = T("jane");

                let X = V("X");
                let Y = V("Y");

                facts(
                    (robert).has("father")(john),
                    (robert).has("mother")(sue),

                    (sally).has("father")(john),
                    (sally).has("mother")(sue),

                    (lisa).has("father")(bill),
                    (lisa).has("mother")(jane)
                );

                let answer = query(
                    (Y).has("mother")(X)
                );

                let strs = [];
                for (let match of answer) {
                    strs.push(match.substitute().toString());
                }

                let str = strs.join("\n");

                str.should.equal("robert has mother sue\n" +
                                "sally has mother sue\n" +
                                "lisa has mother jane");
            });  
            it("should print out a sentence that describes a rule", function() {
                let X = V("X"), Y = V("Y"), Z = V("Z");


                let rule = given(
                    (X).has("parent")(Z),
                    (Y).has("parent")(Z),
                    (Y).is("female")
                ).then(
                    (X).has("sister")(Y)
                );

                let str = rule.toString();

                str.should.equal("if X has parent Z, and Y has parent Z, and Y is female, then X has sister Y");
            });
        });
    });

    describe("given()", function() {
        it("should take a single term and return a chaining object", function() {
            let t1 = T(1);
            let t2 = T(2);

            let r1 = (t1).has("rel to")(t2);
            let r2 = (t2).has("rel to")(t1);

            let obj = given(r1);

            obj.and.should.be.a("function");
            obj.then.should.be.a("function");

            let result = obj.then(r2);

            result[_type].should.satisfy(SymCheck(_RUL));
            // result[_body].should.deep.equal([r1]);
        });
        it("should take multiple terms as arguments and return a chaining object", function() {
            let t1 = T(1);
            let t2 = T(2);
            let t3 = T(3);

            let r1 = (t1).has("rel to")(t2);
            let r2 = (t2).has("rel to")(t3);
            let r3 = (t3).has("rel to")(t1);

            let obj = given(r1, r2);

            obj.and.should.be.a("function");
            obj.then.should.be.a("function");

            let result = obj.then(r3);

            result[_type].should.satisfy(SymCheck(_RUL));
            // result[_body].should.deep.equal([r1, r2]);
            result[_id].should.equal(r3[_id]);
        });
        it("should take partially completed terms", function() {
            let t = T();
            let X = V();
            facts(t.is("a thing"));

            let r1 = X.is("a thing");
            let r2 = X.has("thing-ness");

            let obj = given(r1);

            obj.and.should.be.a("function");
            obj.then.should.be.a("function");

            let result = obj.then(r2);

            let answer = query(t.is("a thing"));

            result[_type].should.satisfy(SymCheck(_RUL));
            // result[_body].should.deep.equal([r1()]);
            result[_id].should.equal(r2()[_id]);
        });
        it("should allow for multiple conclusions", function() {
            let robert = T("robert");
            let john = T("john");
            let jane = T("jane");
            let X = V("X"), Y = V("Y"), Z = V("Z");

            facts(
                robert.has("father")(john),
                robert.has("mother")(jane)
            );

            given(
                X.has("father")(Y),
                X.has("mother")(Z)
            ).then(
                Y.is("married to")(Z),
                Z.is("married to")(Y)
            );

            let answer1 = is(jane)("married to")(john);
            let answer2 = is(john)("married to")(jane);

            answer1.should.be.true;
            answer2.should.be.true;
        })
    });

    describe("is()", function() {
        it("should return true for a query with matches", function() {
            let t = T(1);
            let r = t.is("a thing");

            facts(r);

            let q = is(t)("a thing")();

            q.should.be.true;
        });
        it("should work with negation", function() {
            let t = T(1);
            let r = t.is("a thing");

            facts(r);

            let q = is(t).not("a thing")();

            q.should.be.false;
        })
    });
    describe("does()", function() {
        it("should return an object with a have() method", function() {
            let t = T(1);
            let o = does(t);

            o.should.have.property("have");
            o.have.should.be.a("function");
        });
        it("should return true for a query with matches", function() {
            let t1 = T(1);
            let t2 = T(2);
            let r = t1.has("rel to")(t2);

            facts(r);

            let q1 = does(t1).have("rel to")(t2);
            let q2 = does(t2).have("rel to")(t1);

            q1.should.be.true;
            q2.should.be.false;
        });
        it("should work with negation", function() {
            let t1 = T(1);
            let t2 = T(2);
            let r = t1.has("rel to")(t2);

            facts(r);

            let q1 = does(t1).not.have("rel to")(t2);
            let q2 = does(t2).not.have("rel to")(t1);

            q1.should.be.false;
            q2.should.be.true;
        });
    });
});
