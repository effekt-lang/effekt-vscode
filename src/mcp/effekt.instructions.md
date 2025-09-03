---
applyTo: '**/*.effekt'
---

# Instructions on writing Effekt code

## Syntax Differences from Scala
- Use `if (condition) { then_branch } else { else_branch }` instead of `if condition then ... else ...`
- Always use parentheses when calling functions, even with no arguments: `myFunction()`
- Wrap multiple statements in definitions with curly braces: `def f = { statement1; statement2 }`

## Basic Operations
- Negate boolean `x` with `x.not`
- Get list length with `l.size`, first element with `l.head`
- Create single-constructor data types as follows: `type MyType { MyType(field1: Type1, field2: Type2) }`

## Effect Handling
The main function (`def main()`) cannot have effects in its signature. So no `def main() : Unit / { io } ` for example. Handle effects within the function body.

### Exception Handling
Handle exceptions using `try { ... } with Exception[ErrorType] { def raise(exception, msg) = ... }`

Common patterns for exception handling:
```effekt
// Provide default value on error
with on[MyError].default { defaultValue }
codeThatCanRaiseMyError

// Panic on error
with on[MyError].panic
codeThatCanRaiseMyError
```

### Effect Handler Syntax
```effekt
with handler
code
```
This is syntactic sugar for `handler { code }`.

**Important:**
- Do NOT parenthesize the code block: `with handler { code }` is invalid
- Do NOT use parentheses around the code after `with`

## Development Workflow
- When implementation is incomplete, use holes: `<"TODO: description of what needs to be implemented">`
- An implementation with holes is better than a broken or incomplete implementation without holes.
