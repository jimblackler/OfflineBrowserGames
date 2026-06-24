---
trigger: always_on
---

When working on this codebase, please adhere to the following style and formatting guidelines:

### Formatting

- Ensure no code lines exceed 100 columns in length, except import statements.
- Do not include any unnecessary parentheses/brackets that do not strictly need to be there (e.g.,
  in math/layout expressions where operator precedence or associativity handles evaluation in the
  correct order).
- Do not abbreviate in names (e.g., use 'floorMaterial' instead of 'floorMat', and 'cubeGeometry'
  instead of 'cubeGeo'). Exceptions are 'min' and 'max', which are acceptable.
- Do not use intermediate variables for a calculated value when the intermediate would have a single
  reference, but inlining the expression will reduce the line count (considering the line margin
  requirements). An exception is where the value represents a  'magic' or tuneable number so the
  assignment acts as a form of comment, such as `const targetAspect = 1000 / 800;`.
- When an anonymous object is created to satisfy a specific type definition (e.g., returned from a
  function with a declared return type), omit type annotations on its members or parameters if they
  are not strictly necessary and can be contextually inferred.

### Safety and Assertions

- Where a variable (e.g., dereferenced with `[]`, or obtained from a map) is expected not to be
  undefined per the logic of the app, use the `assertDefined()` wrapper to verify that as early as
  possible.
