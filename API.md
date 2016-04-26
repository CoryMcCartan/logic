# given

Create and register a rule.

**Parameters**

-   `args` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** a predicate or predicates for the rule.

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** an object with then() and and() methods attached. Use
and() to add further predicates, and then() to add the consclusions. 
and() returns the same object, and then() registers the final rule in the
database.

# query

Query the database.

**Parameters**

-   `goal` **Term** a term that is the query.

**Examples**

```javascript
let robert = T("robert");
let john = T("john");
let X = V("X");

facts(
    robert.has("father")(john)
);

for (let solution of query(X.has("father")(john)) ) {
   solution instanceof Map; // true
   solution.get(X) === robert; // true
}
```

_Each solution has a substitute() method attached that returns the original
goal, with variables substittued for their solved values. Using the above
definitions:_

```javascript
for (let solution of query(X.has("father")(john)) ) {
    let answer = solution.substitute();
    answer === robert.has("father")(john); // true
}
```

Returns **GeneratorFunction** a generator that yields Maps.  Each map
contains bindings from variables in the query to actual, solved, values.

# T

Add logic functionality to an object, or create a new object with
logic functionality. This function creates a term object.

**Parameters**

-   `arg1` **Any** either the object to wrap, or a primitive ID.
-   `arg2` **Any** a primitive ID, if an object was passed to arg1.

**Examples**

_The constructor may be called without any arguments, in which case the
  term is assigned an internal, hidden identifier:_

```javascript
let term = T();
```

_It may also be called with a single primitive argument, which will be
  used as the term's identifier:_

```javascript
let term_1 = T("term 1");
let term_2 = T(2);
let term_3 = T(Symbol("term 3"));
```

_The constructor may also be called with an object to wrap, and an
  optional identifier.  If no identifier is passed, a hidden default
  will be used, as above._

```javascript
let person = {
    first_name: "John",
    last_name: "Doe"
};
let term_1 = T(person, "John Doe");
let term_2 = T(person); // hidden identifier
```

_The function returns the constructed term, which has three methods
  attached to create compound terms.  The methods, has(), is(), does(),
  all operate the same way.  If the
  object passed to this constructor already has any of these properties,
  they will be backed up to '\_has' or '\_is,' or etc. Compound terms are
  created by calling either method with an identifier.  Further terms
  can be appedned to the end as well._

```javascript
let john = T("john");
let robert = T("robert");

john.is("a person");
robert.has("father")(john);
robert.is.not("a father");
```

Returns **Term** a logic term object. The object is a modified version of 
the object that was passed in, not a separate copy.

# V

Add logic functionality to an object, or create a new object with
logic functionality.  This function creates a variable object.

**Parameters**

-   `arg1` **Any** either the object to wrap, or a primitive ID.
-   `arg2` **Any** a primitive ID, if an object was passed to arg1.

Returns **Variable** a logic term object. This constructor operates in the same way as `T` above.  Compound
terms can be created in the same way as well.
