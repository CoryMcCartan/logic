var should = chai.should();

describe("WAM", function() {
    it("should parse basic W_0 program and query terms", function() {
        let h = "h".charCodeAt(0),
            f = "f".charCodeAt(0),
            p = "p".charCodeAt(0),
            a = "a".charCodeAt(0);
        let Z = 2,
            W = 8,
            Y = 4,
            X = 5;

        WAM.putStructure(h, 2, 3);
        WAM.setVariable(Z);
        WAM.setVariable(W);
        WAM.putStructure(f, 1, 4);
        WAM.setValue(W);
        WAM.putStructure(p, 3, 1);
        WAM.setValue(Z);
        WAM.setValue(3);
        WAM.setValue(4);

        WAM.getStructure(p, 3, 1); 
        WAM.unifyVariable(2);
        WAM.unifyVariable(3);
        WAM.unifyVariable(Y);
        WAM.getStructure(f, 1, 2); 
        WAM.unifyVariable(X);
        WAM.getStructure(h, 2, 3);
        WAM.unifyValue(Y);
        WAM.unifyVariable(6);
        WAM.getStructure(f, 1, 6);
        WAM.unifyVariable(7);
        WAM.getStructure(a, 0, 7);

        var z_binding = WAM.traceBinding(_r[Z][1]);
        var w_binding = WAM.traceBinding(_r[W][1]);
        var x_binding = WAM.traceBinding(_r[X][1]);
        var y_binding = WAM.traceBinding(_r[Y][1]);

        z_binding.should.equal("f(f(a))");
        w_binding.should.equal("f(a)");
        x_binding.should.equal("f(a)");
        y_binding.should.equal("f(f(a))");
    });
    it("should parse basic W_1 program and query terms", function() {
        let h = "h".charCodeAt(0),
            f = "f".charCodeAt(0),
            p = "p".charCodeAt(0),
            a = "a".charCodeAt(0);

        let Z = 1,
            W = 8,
            X = 4,
            Y = 5;

        WAM.putVariable(4, Z);
        WAM.putStructure(h, 2, 2);
        WAM.setValue(4);
        WAM.setVariable(W);
        WAM.putStructure(f, 1, 3);
        WAM.setValue(W);

        WAM.getStructure(f, 1, 1);
        WAM.unifyVariable(X);
        WAM.getStructure(h, 2, 2);
        WAM.unifyVariable(Y);
        WAM.unifyVariable(6);
        WAM.getValue(Y, 3);
        WAM.getStructure(f, 1, 6);
        WAM.unifyVariable(7);
        WAM.getStructure(a, 0, 7);

        var z_binding = WAM.traceBinding(_r[Z][1]);
        var w_binding = WAM.traceBinding(_r[W][1]);
        var x_binding = WAM.traceBinding(_r[X][1]);
        var y_binding = WAM.traceBinding(_r[Y][1]);

        z_binding.should.equal("f(f(a))");
        w_binding.should.equal("f(a)");
        x_binding.should.equal("f(a)");
        y_binding.should.equal("f(f(a))");
    });
});

