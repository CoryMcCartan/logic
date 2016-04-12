# LJS
## Logical JavaScript

LJS is an ES6 logic library.  It allows you to connect ordinary JavaScript
objects with logical relationships, and then make queries about those
relationships.

## Installation

- Bower: `bower install lgs`

Or you can download `logic.js` above.

## Basic Usage

### Data Types
LJS works with *terms* and *variables*.  Terms are just normal JavaScript
objects with some extra, hidden, LJS parameters attached.  They are used to
represent things and relationships.  Things are represented by simple terms.
They're just abstract objects with a label.  Relationships are represented by
compound terms.  Compound terms take variables or simple terms and define some
sort of relationship between them.  For example:
```javascript
let socrates = T("Socrates");
let plato = T("Plato");

socrates.is("human");
plato.is("human");

plato.has("teacher")(socrates);
```
Simple terms are created using the `T` function.  Compound terms are created by
calling the `has` and `is` methods on a term.

But simply delcaring terms is not enough.  We have to tell LJS that these
relationships are facts.  We do so by passing them to the `terms` function:
```javascript
terms(
    socrates.is("human"),
    plato.is("human"),
    plato.has("teacher")(socrates)
);
```

### Queries
Once we've defined our facts, we can ask LJS questions about them, using the
`query` function:
```javascript
let who = V("who");

let answer = query(
    who.has("teacher")(socrates)
);
```
Note the use of the `V` function to create a new variable.

The `query` function does not return `plato` here.  Instead, it returns a
generator that yields all possible solutions to the query.  Each solution is
itself a `Map` that tells which variables are bound to which terms.  So in the
example above:
```javascript
for (let solution of answer) {
    // solution is a Map
    solution.get(who) === plato; // true
}
``` 

Each solution is also equipped with a function `substitute` that returns the
original query term with the variables substituted.  And every term has a
`toString` method that turns it into a readable English sentence.  So we can
do:
```javascript
for (let solution of answer) {
    let query_result = solution.substitute(); // is a term 
    query_result.toString(); // "Plato has teacher Socrates"
}
``` 

### Rules
The real power of LJS becomes available when we start to define rules.  Rules 
allow us to determine new relationships based on currently defined facts.  For 
example:
```javascript
let socrates = T("Socrates");
let X = V("X");

terms(
    socrates.is("human")
);

given(
    X.is("human")
).then(
    X.is("mortal")
);

let answer = query(
    socrates.is("mortal")
);

for (let solution of answer) {
    solution.substitute().toString(); // "Socrates is mortal"
}
```
The `given` function returns an object with `and` and `then` methods.  The `and`
method allows us to add more predicates, or requirements, for the conclusion.
The `then` method defines the conclusions of the rule.

Sometimes, however, we just want a simple answer to a question, instead of a
generator that returns variable bindings.  LJS provides two global helper
functions, `is` and `does`, for this purpose.  Using the terms defined above, we
can do the following:
```javascript
+does(plato).have("teacher")(socrates); // 1
+is(socrates)("mortal"); // 1
```

## More Information
More detailed notes on the usage of all the functions of LJS can be found in the
[API](API.md).
