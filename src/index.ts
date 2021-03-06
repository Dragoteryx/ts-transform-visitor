import ts from "typescript";

export type Type = "program" | "checker" | "compilerOptions" | "config" | "raw";
export type Result = ts.Node | ts.Node[] | null | void;

export interface RawVisitor {
  readonly sourceFile: ts.SourceFile;
  readonly context: ts.TransformationContext;
  readonly factory: ts.NodeFactory;
  readonly compilerOptions: ts.CompilerOptions;
  blackboard: Record<string, any>;
}
export interface ConfigVisitor extends RawVisitor {
  readonly config: Record<string, any>;
}
export interface TypeCheckerVisitor extends ConfigVisitor {
  readonly typeChecker: ts.TypeChecker;
}
export interface ProgramVisitor extends TypeCheckerVisitor {
  readonly program: ts.Program;
}

export type Visitor<T extends Type> =
  T extends "program" ?
    ProgramVisitor :
    T extends "checker" ?
      TypeCheckerVisitor :
      T extends "raw" ?
        RawVisitor :
        ConfigVisitor;

/**
 * Utility function to create a TypeScript transformer using the visitor pattern.
 * 
 * The visit function can return either a node, an array of nodes or null to remove the current node.
 * Returning nothing or undefined visits the children nodes.
 * @param type What type of TypeScript transformer to use
 * @param visit The visit function
 */
export default function transform<T extends Type>(type: T, visit: (this: Visitor<T>, node: ts.Node) => Result) {
  return function(...args: any[]): any {
    switch (type) {
      case "program":
        return transform("raw", function(node) {
          // @ts-expect-error
          this.program ??= args[0];
          // @ts-expect-error
          this.typeChecker ??= this.program?.getTypeChecker();
          // @ts-expect-error
          this.config ??= args[1];
          return visit.call(this as any, node);
        });
      case "checker":
        return transform("raw", function(node) {
          // @ts-expect-error
          this.typeChecker ??= args[0];
          // @ts-expect-error
          this.config ??= args[1];
          return visit.call(this as any, node);
        });
      case "compilerOptions":
        return transform("raw", function(node) {
          // @ts-expect-error
          this.config ??= args[1];
          return visit.call(this as any, node);
        });
      case "config":
        return transform("raw", function(node) {
          // @ts-expect-error
          this.config ??= args[0];
          return visit.call(this as any, node);
        });
      case "raw":
        const context: ts.TransformationContext = args[0];
        return (sourceFile: ts.SourceFile) => {
          const visitorObj = {
            context, sourceFile,
            factory: context.factory,
            compilerOptions: context.getCompilerOptions()
          };
          const visitor: ts.Visitor = node => {
            const res = visit.call(visitorObj as any, node);
            if (res === undefined)
              return ts.visitEachChild(node, visitor, context);
            else return res === null ? undefined : res;
          }
          return ts.visitNode(sourceFile, visitor);
        };
      default:
        throw new TypeError(`'${type}' isn't a valid transformer factory type.`);
    }
  }
}