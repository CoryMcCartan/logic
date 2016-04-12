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

_The function returns the constructed term, which has two methods
  attached to create compound terms.  The methods, has() and is(),
  operate the same way.  If the object passed to this constructor
  already has properties 'has' and 'is,' they will be backed up to
  '\_has' and '\_is.' Compound terms are created by calling either has()
  or is() with an identifier.  Further terms can be appedned to the end
  as well._

```javascript
let john = T("john");
let robert = T("robert");

john.is("a person");
robert.has("father")(john);
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
