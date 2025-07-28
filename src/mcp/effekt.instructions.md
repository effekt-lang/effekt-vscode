---
applyTo: '**/*.effekt'
---

# Instructions on writing Effekt code

Negate `x: Bool` by writing `x.not`.
Handle exceptions `MyError` using `try { ... } with Exception[ErrorType] { def raise(exception, msg) = ... }`.
Even though the Effekt language is similiar in syntax to Scala, not all Scala code is valid Effekt code.
Do not assume Scala code will work in Effekt.
For example, `if e1 then e2 else e3` is not valid Effekt code, use `if (e1) { e2 } else { e3 }` instead.
To get the length of a list `l`, use `l.size`, to get the first element use `l.head`.
If there are multiple statements in a definition, wrap them in curly braces, e.g. `def f = { ... }`.
To create a data type with a single constructor, use `type MyType { MyType() }`.
A common pattern to handle exceptions is to use the following patterns:

If it makes sense to provide a default value when an error occurs, you can use:
```
with on[MyError].default { defaultValueGoesHere }
codeThatCanRaiseMyError
```

```
with on[MyError].panic
codeThatCanRaiseMyError
```

In general, note that
```
with f
code
```
is syntax sugar for `f { code }`, i.e. supplying a block argument to`f`.
In particular, do not parenthsize `code`. `with f { code }` will not work!
When you call functions, always use parentheses, even if there are no arguments.

Do not be contempt with subpar code. If you don't manage to implement part of the program, create a hole with the syntax `<"Put the TODO description here">`.
