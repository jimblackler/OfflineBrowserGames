---
trigger: always_on
---

When working on this codebase, please adhere to the following style and formatting guidelines:

# All file types

- Ensure no code lines exceed 100 columns in length, except import statements.

## TypeScript

- Import statements should always be on one line, even if that means exceeding 100 columns in
  length.
- Do not include any unnecessary parentheses/brackets that do not strictly need to be there (e.g.,
  in math/layout expressions where operator precedence or associativity handles evaluation in the
  correct order).
- Don't specify TypeScript types where they would otherwise be inferred to the same type.
- Do not abbreviate in names (e.g., use 'floorMaterial' instead of 'floorMat', and 'cubeGeometry'
  instead of 'cubeGeo'). Exceptions are 'min' and 'max', which are acceptable.
- Do not use intermediate variables for a calculated value when the intermediate would have a single
  reference, but inlining the expression will reduce the line count (considering the line margin
  requirements). An exception is where the value represents a  'magic' or tuneable number so the
  assignment acts as a form of comment, such as `const targetAspect = 1000 / 800;`.
- When an anonymous object is created to satisfy a specific type definition (e.g., returned from a
  function with a declared return type), omit type annotations on its members or parameters if they
  are not strictly necessary and can be contextually inferred.
- Where a variable (e.g., dereferenced with `[]`, or obtained from a map) is expected not to be
  undefined per the logic of the app, use the `assertDefined()` wrapper to verify that as early as
  possible.
- Where a variable needs to have its type narrowed to a specific type that it is expected to be, use
  the `assertIs` method, e.g. prefer `assertIs(Float32Array, array);` to wrapping a section with
  `if (array instanceof Float32Array) {...}`.
- Prefer 'undefined' to 'null' where possible.
- Literal representations of whole numbers should not have a decimal point and trailing zeroes, e.g.
  prefer '0' to '0.0', '1' to '1.0'.
- Literal expression should be on the right-hand side of a binary expression, e.g. prefer
  `random() * 0.45 + 0.55` to `0.55 + random() * 0.45`.
- Use destructuring in simple cases where the properties are not nested (like
  `const {name, age} = user;` or `const [first] = array;`) but not cases like
  `const {colorAttribute: {array}} = layer;` (prefer in that case
  `const array = layer.colorAttribute.array;`). Prefer to use destructuring if it makes sense that
  the variable shares the name of the property.

## Style Sheets

- Always specify both the tag type and the class or ID type, e.g. `div#intro` not `#intro`.
- Use nesting in the style sheets to match the nesting in the markup, e.g. `section.navigation {
  a.link { ... } }` not `section.navigation a.link {...}`.
