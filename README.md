# LJS
## Logical JavaScript

LJS is an ES6 logic library.  It allows you to connect ordinary JavaScript
objects with logical relationships, and then make queries about those
relationships.

## Installation

- Bower: `bower install lgs`

Or you can download `logic.js` above.

## Usage

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

Once we've defined our facts, we can ask LJS questions about them, using the
`query` function:
```javascript
let who = V("who");

let answer = query(
    who.has("teacher")(socrates)
);
```

The `query` function does not return `plato` here.  Instead, it returns a generator
that yields all possible solutions to the query.  Each solution is itself a `Map`
that tells which variables are bound to which terms.  So in the example above:
```javascript
for (let solution of answer) {
    // solution is a Map
    solution.get(who) === plato; // true
}
```
