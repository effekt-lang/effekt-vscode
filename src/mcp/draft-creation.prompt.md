# Draft Creation Prompt

Create a draft structure for this Effekt file. Generate only function/method signatures with descriptive holes that explain what each function should do.

## Instructions:
- Analyze the existing code to understand the intended program structure
- If the context is unclear or the file is empty/minimal, ask the user what kind of program they want to create 
- Create function signatures for missing functionality
- Use descriptive holes like "description of what this function should return" instead of empty holes
- Focus on creating a logical program structure with clear interfaces
- Don't implement the function bodies - only create signatures with meaningful hole descriptions
- Consider the types and effects that would be appropriate for each function

## Examples of what to generate:

```effekt
// Substitute variable with value in expression
def substitute(expr: Expr, variable: String, value: Expr): Expr = <"replace all free occurrences of variable with value in expression">

// Update game state after a guess
def makeGuess(state: GameState, char: Char): GameState = <"update game state with new guess, incrementing wrong guesses if character not in word">

// Evaluate expression to normal form
def eval(expr: Expr, env: Env): Expr / { Exception[UnboundVariable], Exception[StuckExpression] } = <"repeatedly apply step until normal form is reached">
```

Please analyze the current file and suggest a draft structure with function signatures and descriptive holes following these patterns.