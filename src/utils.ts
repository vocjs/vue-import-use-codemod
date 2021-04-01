import type { CodeModOptions } from './options';
import type { API, Collection, ImportDeclaration } from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';
import { CODE_MOD_OPTIONS } from './options';

/**
 * 获取样式文件
 * @param lib
 * @param style
 */
const styleFile = ({ libraryName, style }: CodeModOptions = CODE_MOD_OPTIONS) => {
  let result: string;
  if (style && typeof style === 'string') {
    result = `${libraryName}/dist/${style}.less`;
  } else if (style && typeof style === 'object') {
    const { dir, name, suffix } = style;
    result = `${libraryName}/${dir}/${name}.${suffix}`;
  } else {
    result = '';
  }
  return result;
};

/**
 * 获取样式语言
 * @param opts
 */
const styleLang = (opts: CodeModOptions) => {
  const { style } = opts;
  if (typeof style === 'object' && style.suffix === 'css') {
    return 'css';
  }
  return true;
};

/**
 * 去除文件后缀名
 * @param file
 */
const removeSuffix = (file: string) => file.substring(0, file.lastIndexOf('.'));

/**
 * 忽略文件后缀判断是否相等
 * @param s1
 * @param s2
 */
const equalsIgnoreSuffix = (s1: string, s2: string) => {
  return removeSuffix(s1) === removeSuffix(s2);
};

/**
 * 导入 AST 的 hash 值
 * @param node
 */
const importAstHash = (node: ImportDeclaration) =>
  JSON.stringify({
    specifiers: node.specifiers.map((kind) => kind.local.name),
    source: node.source.value,
  });

/**
 * 添加导入语句
 * @param root
 * @param api
 * @param imports 导入语句
 */
const addImport = (root: Collection, api: API, imports: string | string[]) => {
  /* 1.查找到所有的已导入语句 */
  const importedDeclarations = root.find<ImportDeclaration>(api.j.ImportDeclaration as AstType<ImportDeclaration>);
  const importedAstHash = new Set(importedDeclarations.nodes().map(importAstHash));

  /* 2. 生成需要导入的 ast 节点 */
  const toImport: string[] = Array.isArray(imports) ? imports : [imports];
  const nonDuplicates = (node: ImportDeclaration) => !importedAstHash.has(importAstHash(node));
  const importAstNodes: ImportDeclaration[] = toImport
    .map((txt) => api.j(`${txt}\n`).nodes()[0].program.body[0] as ImportDeclaration)
    .filter(nonDuplicates);

  if (importedDeclarations.length) {
    importedDeclarations
      // 在最后一个元素后插入
      .at(-1)
      // a tricky way to avoid blank line after the previous import
      .forEach(({ node }) => delete node.loc)
      .insertAfter(importAstNodes);
  } else {
    // no pre-existing import declarations
    root.get().node.program.body.unshift(...importAstNodes);
  }
};

/**
 * 生成导入语句
 * @param style
 * @param opts
 */
const importStatement = (style: boolean, opts: CodeModOptions = CODE_MOD_OPTIONS) => {
  if (style) {
    return `import '${styleFile(opts)}';`;
  }
  const { defaultImport, importName, libraryName } = opts;
  const actualName = defaultImport ? importName : `{ ${importName} }`;
  return `import ${actualName} from '${libraryName}';`;
};

export { styleFile, styleLang, equalsIgnoreSuffix, addImport, importStatement };
