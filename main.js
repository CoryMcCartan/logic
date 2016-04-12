let robert = T("robert");
let sally  = T("sally");
let lisa   = T("lisa");
let john   = T("john");
let sue    = T("sue");
let bill   = T("bill");
let jane   = T("jane");

let X = V("X");
let Y = V("Y");
let Z = V("Z");

terms(
    (robert).has("father")(john),
    (robert).has("mother")(sue),
    (robert).is("male"),

    (sally).has("father")(john),
    (sally).has("mother")(sue),
    (sally).is("female"),

    (lisa).has("father")(bill),
    (lisa).has("mother")(jane),
    (lisa).is("female"),

    (john).is("male"),
    (sue).is("female"),
    (bill).is("male"),
    (jane).is("female")
);

given(
    (X).has("father")(Y)
).then(
    (X).has("parent")(Y)
);
given(
    (X).has("mother")(Y)
).then(
    (X).has("parent")(Y)
);


given(
    (X).has("parent")(Y),
    (X).is("male")
).then(
    (Y).has("son")(X)
);

given(
    (X).has("parent")(Y),
    (X).is("female")
).then(
    (Y).has("daughter")(X)
);

given(
    (X).has("parent")(Z),
    (Y).has("parent")(Z),
    (Y).is("female")
).then(
    (X).has("sister")(Y)
);

let q = (Y).has("mother")(X);

for (let solution of query(q)) {
    console.log(solution.substitute().toString());
}

/*
answer = logic.does(robert).have("father")(john);
console.log(answer.toString());

answer = logic.is(bill)("a person")();
console.log(answer.toString());
*/

q = (Y).has("daughter")(X);
for (let solution of query(q)) {
    console.log(solution.substitute().toString());
}
