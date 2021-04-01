import type {
  API,
  Collection,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportSpecifier,
  Specifier,
  StringLiteral,
} from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';
import type { CodeModOptions } from '../options';
import { addImport, importStatement } from '../utils';

/**
 * 添加或更新导入的库
 * @param root
 * @param importLib
 * @param api
 * @param opts
 */
function save(root: Collection, importLib: Collection<ImportDeclaration>, api: API, opts: CodeModOptions) {
  const { defaultImport, importName } = opts;
  const specifier = api.j.Specifier as AstType<Specifier>;
  const identifier = api.j.Identifier as AstType<Identifier>;
  const importSpecifier = api.j.ImportSpecifier as AstType<ImportSpecifier>;
  const importDefaultSpecifier = api.j.ImportDefaultSpecifier as AstType<ImportDefaultSpecifier>;

  /* 已存在节点更新 */
  importLib
    .find<Specifier>(specifier, (ast) => {
      const { local } = ast;
      return identifier.check(local) && importName === local.name;
    })
    .replaceWith((ast) => {
      if (defaultImport && importSpecifier.check(ast.value)) {
        return api.j.importDefaultSpecifier(api.j.identifier(importName));
      }
      if (!defaultImport && importDefaultSpecifier.check(ast.value)) {
        return api.j.importSpecifier(api.j.identifier(importName), api.j.identifier(importName));
      }
      return ast.value;
    });

  /* 去重添加 */
  const imports: string = importStatement(false, opts);
  addImport(root, api, imports);
}

/**
 * 转换 import 导入代码
 * @param root
 * @param api
 * @param opts
 */
export default (root: Collection, api: API, opts: CodeModOptions) => {
  const { libraryName, remove } = opts;
  /* 1. 先找到导入的代码节点 */
  const importLib = root.find<ImportDeclaration>(
    api.jscodeshift.ImportDeclaration as AstType<ImportDeclaration>,
    (ast) => {
      const { source } = ast;
      const stringLiteral = api.jscodeshift.StringLiteral as AstType<StringLiteral>;
      return stringLiteral.check(source) && libraryName === source.value;
    },
  );

  /* 2. 移除代码节点还是更新保存 */
  if (remove) {
    importLib.remove();
  } else {
    save(root, importLib, api, opts);
  }
};
