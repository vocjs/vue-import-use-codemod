import type {
  Collection,
  ImportDeclaration,
  Parser,
  Transform,
  CallExpression,
  Identifier,
  MemberExpression,
  ImportSpecifier,
  ImportDefaultSpecifier,
  StringLiteral,
  Specifier,
} from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';

export type TransformModule = Transform & {
  default?: Transform;
  parser?: string | Parser;
};

export type UseOptions = {
  /**
   * @description 是否默认导入
   * @default true
   */
  defaultImport?: boolean;

  /**
   * @description 默认导出名称
   */
  name: string;

  /**
   * @description 组件库名称
   */
  lib: string;

  /**
   * @description 样式文件目录
   * @default dist
   */
  styleDir?: string;

  /**
   * @description 样式文件名称
   * @default false
   */
  styleName?: string | false;

  /**
   * @description 演示文件名后缀
   * @default less
   */
  styleSuffix?: 'css' | 'less' | 'sass' | 'scss' | 'styl' | string;
};

type useFn = (option: UseOptions) => TransformModule;

const use: useFn = (opts) => {
  const useTransform: TransformModule = (file, api) => {
    const j = api.jscodeshift;
    const root: Collection = j(file.source);

    const { defaultImport = true, name, lib, styleDir = 'dist', styleName = false, styleSuffix = 'less' } = opts;
    const actualName = defaultImport ? name : `{ ${name} }`;
    const imports: string[] = [`import ${actualName} from '${lib}';`];
    const style: string = `${lib}/${styleDir}/${styleName}`;

    if (styleName) {
      imports.push(`import '${style}.${styleSuffix}';`);
    }

    /**
     * 需要导入的 AST
     * @param txt
     */
    const toImportAST = (txt: string) => j(`${txt}\n`).nodes()[0].program.body[0];

    /**
     * 去取样式文件后缀名
     * @param styles
     */
    const noSuffix = (styles: string) => styles.substring(0, styles.lastIndexOf('.'));

    /**
     * 需要导入 AST 的 hash 值
     * @param node
     */
    const toImportHash = (node: ImportDeclaration) =>
      JSON.stringify({
        specifiers: node.specifiers.map((s) => s.local.name),
        source: node.source.value,
      });

    const importDefaultSpecifier = j.ImportDefaultSpecifier as AstType<ImportDefaultSpecifier>;
    const importSpecifier = j.ImportSpecifier as AstType<ImportSpecifier>;
    const memberExpression = j.MemberExpression as AstType<MemberExpression>;
    const identifier = j.Identifier as AstType<Identifier>;
    const stringLiteral = j.StringLiteral as AstType<StringLiteral>;

    const importDeclarations = root.find<ImportDeclaration>(j.ImportDeclaration as AstType<ImportDeclaration>);

    /* 已存在导入,替换成正确的导入方式 */
    importDeclarations
      .filter((ast) => {
        const {
          value: { source },
        } = ast;
        return stringLiteral.check(source) && lib === source.value;
      })
      .find<Specifier>(j.Specifier as AstType<Specifier>, (ast) => {
        const { local } = ast;
        return identifier.check(local) && name === local.name;
      })
      .replaceWith((ast) => {
        if (defaultImport && importSpecifier.check(ast.value)) {
          return j.importDefaultSpecifier(j.identifier(name));
        }
        if (!defaultImport && importDefaultSpecifier.check(ast.value)) {
          return j.importSpecifier(j.identifier(name), j.identifier(name));
        }
        return ast.value;
      });

    /* 已存在样式文件,替换成正确的样式文件 */
    importDeclarations
      .filter((ast) => {
        const {
          value: { specifiers, source },
        } = ast;
        return !specifiers.length && stringLiteral.check(source) && style === noSuffix(source.value);
      })
      .replaceWith((ast) => {
        return j.importDeclaration([], j.stringLiteral(`${style}.${styleSuffix}`));
      });

    const importSet = new Set(importDeclarations.nodes().map(toImportHash));
    const nonDuplicates = (node: ImportDeclaration) => !importSet.has(toImportHash(node));

    const importASTNodes: ImportDeclaration[] = imports.map(toImportAST).filter(nonDuplicates);
    if (importDeclarations.length) {
      importDeclarations
        // 在最后一个元素后插入
        .at(-1)
        // a tricky way to avoid blank line after the previous import
        .forEach(({ node }) => delete node.loc)
        .insertAfter(importASTNodes);
    } else {
      // no pre-existing import declarations
      root.get().node.program.body.unshift(...importASTNodes);
    }

    const used =
      root.find<CallExpression>(j.CallExpression as AstType<CallExpression>, (ast) => {
        return (
          memberExpression.check(ast.callee) &&
          identifier.check(ast.callee.property) &&
          ast.callee.property.name === 'use' &&
          identifier.check(ast.arguments[0]) &&
          name === ast.arguments[0].name
        );
      }).length > 0;

    /* AST 中已经存在 use 代码则不处理 */
    if (!used) {
      const appRoots = root.find<CallExpression>(j.CallExpression as AstType<CallExpression>, (ast) => {
        if (identifier.check(ast.callee) && ast.callee.name === 'createApp') {
          return true;
        }

        return (
          memberExpression.check(ast.callee) &&
          identifier.check(ast.callee.object) &&
          ast.callee.object.name === 'Vue' &&
          identifier.check(ast.callee.property) &&
          ast.callee.property.name === 'createApp'
        );
      });

      appRoots.replaceWith(({ node: createAppCall }) => {
        return j.callExpression(j.memberExpression(createAppCall, j.identifier('use')), [j.identifier(name)]);
      });
    }

    return root.toSource();
  };
  return useTransform;
};

export default use;
