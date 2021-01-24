# TS Transform Visitor

A TypeScript utility function to easily create transformers using the visitor pattern.

## How to use
```ts
import transform from "ts-transform-visitor";
import ts from "typescript";

export default transform("program", function(node) {
  if (ts.isDecorator(node)) return null;
});
```
The visit function can return either a node, an array of nodes or null to remove the current node.
Returning nothing or undefined visits the children nodes.