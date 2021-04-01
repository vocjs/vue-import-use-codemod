import type { API, Collection, ImportDeclaration, StringLiteral } from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';
import type { CodeModOptions } from '../options';
import { addImport, equalsIgnoreSuffix, importStatement, styleFile } from '../utils';

/**
 * 添加或更新导入样式
 * @param root
 * @param importStyle
 * @param api
 * @param opts
 */
function save(root: Collection, importStyle: Collection<ImportDeclaration>, api: API, opts: CodeModOptions) {
  /* 已存在节点更新 */
  importStyle.replaceWith(() => {
    const style = styleFile(opts);
    return api.j.importDeclaration([], api.j.stringLiteral(style));
  });

  /* 去重添加 */
  const imports: string = importStatement(true, opts);
  addImport(root, api, imports);
}

/**
 * 转换 import 导入代码
 * @param root
 * @param api
 * @param opts
 */
export default (root: Collection, api: API, opts: CodeModOptions) => {
  const { remove } = opts;
  /* 1. 先找到导入样式的代码节点 */
  const importStyle = root.find<ImportDeclaration>(
    api.jscodeshift.ImportDeclaration as AstType<ImportDeclaration>,
    (ast) => {
      const { specifiers, source } = ast;
      const stringLiteral = api.jscodeshift.StringLiteral as AstType<StringLiteral>;
      const style = styleFile(opts);
      const exist = equalsIgnoreSuffix(style, source.value);
      return !specifiers.length && stringLiteral.check(source) && exist;
    },
  );

  /* 2. 移除代码节点还是更新保存 */
  if (remove) {
    importStyle.remove();
  } else {
    save(root, importStyle, api, opts);
  }
};
