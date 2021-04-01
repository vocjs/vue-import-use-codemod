import type { API, CallExpression, Collection, Identifier, MemberExpression } from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';
import type { CodeModOptions } from '../options';

/**
 * 添加或移除 use 逻辑代码
 * @param root
 * @param exist
 * @param api
 * @param opts
 */
function save(root: Collection, exist: boolean, api: API, opts: CodeModOptions) {
  /* AST 中已经存在 use 代码则不处理 */
  if (!exist) {
    const { importName } = opts;
    const identifier = api.j.Identifier as AstType<Identifier>;
    const memberExpression = api.j.MemberExpression as AstType<MemberExpression>;
    const appRoots = root.find<CallExpression>(api.j.CallExpression as AstType<CallExpression>, (ast) => {
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
      return api.j.callExpression(api.j.memberExpression(createAppCall, api.j.identifier('use')), [
        api.j.identifier(importName),
      ]);
    });
  }
}

/**
 * 转换 use 使用代码
 * @param root
 * @param api
 * @param opts
 */
export default (root: Collection, api: API, opts: CodeModOptions) => {
  const { importName, remove } = opts;
  const memberExpression = api.j.MemberExpression as AstType<MemberExpression>;
  const identifier = api.j.Identifier as AstType<Identifier>;

  /* 1. 先找到 use 代码节点 */
  const used = root.find<CallExpression>(api.j.CallExpression as AstType<CallExpression>, (ast) => {
    return (
      memberExpression.check(ast.callee) &&
      identifier.check(ast.callee.property) &&
      ast.callee.property.name === 'use' &&
      identifier.check(ast.arguments[0]) &&
      importName === ast.arguments[0].name
    );
  });

  /* 2. 移除代码节点还是更新保存 */
  if (remove) {
    used.replaceWith((ast) => {
      return (ast.node.callee as MemberExpression).object;
    });
  } else {
    save(root, used.length > 0, api, opts);
  }
};
