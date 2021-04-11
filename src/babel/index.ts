import type { Collection, Identifier, Transform, Property, Literal } from 'jscodeshift';
import type { CodeModOptions } from '../options';
import { CODE_MOD_OPTIONS } from '../options';
import type { ObjectExpression, ArrayExpression, API } from 'jscodeshift';
import type { Type as AstType } from 'ast-types/lib/types';
import { styleLang } from '../utils';

type UseTransform = (option: CodeModOptions) => Transform;

/**
 *  确保存在 plugins 节点
 * @param properties
 * @param api
 */
function ensurePluginsProperty(properties: Collection<Property>, api: API) {
  const plugins = properties.filter(({ node }) => {
    const { key } = node as Property;
    return (key as Identifier).name === 'plugins';
  });
  /* 不存在则 添加 plugins 节点 */
  if (!plugins.length) {
    const pluginsProperty: Property = api.j.property('init', api.j.identifier('plugins'), api.j.arrayExpression([]));
    properties.at(-1).insertAfter(pluginsProperty);
  }
}

/**
 * 保存或修改配置信息
 * @param plugins
 * @param pluginNodes
 * @param pluginNode
 * @param api
 * @param opts
 */
function save(
  plugins: Collection<Property>,
  pluginNodes: Collection<ArrayExpression>,
  pluginNode: Collection<ArrayExpression>,
  api: API,
  opts: CodeModOptions,
) {
  const exist: boolean = pluginNode.length > 0;
  const { libraryName, libraryDirectory, babelPluginOptions = {} } = opts;
  const props: Property[] = [];
  props.push(api.j.property('init', api.j.identifier('libraryName'), api.j.literal(libraryName)));
  props.push(api.j.property('init', api.j.identifier('libraryDirectory'), api.j.literal(libraryDirectory)));
  props.push(api.j.property('init', api.j.identifier('style'), api.j.literal(styleLang(opts))));

  Object.entries<string | boolean | number>(babelPluginOptions)
    .filter(([k, v]) => {
      return !['libraryName', 'libraryDirectory', 'style'].includes(k);
    })
    .forEach(([k, v]) => {
      props.push(api.j.property('init', api.j.identifier(k), api.j.literal(v)));
    });

  const option = api.j.objectExpression(props);

  if (exist) {
    pluginNode.replaceWith(({ node }) => {
      const { elements } = node;
      elements.splice(1, 1, option);
      return api.j.arrayExpression(elements);
    });
  } else {
    const elementArray: any[] = [];
    elementArray.push(api.j.literal('import'));
    elementArray.push(option);
    elementArray.push(api.j.literal(libraryName));
    const pluginConf = api.j.arrayExpression(elementArray);

    if (pluginNodes.length > 0) {
      pluginNodes.at(-1).insertAfter(pluginConf);
    } else {
      plugins.replaceWith(({ node }) => {
        const { elements } = node.value as ArrayExpression;
        elements.push(pluginConf);
        return node;
      });
    }
  }
}

const babelTransform: UseTransform = (opts) => {
  return (file, api) => {
    const j = api.jscodeshift;
    const root: Collection = j(file.source);

    const identifier = j.Identifier as AstType<Identifier>;
    const literal = j.Literal as AstType<Literal>;
    const arrayExpression = j.ArrayExpression as AstType<ArrayExpression>;
    const objectExpression = j.ObjectExpression as AstType<ObjectExpression>;

    /* 1. 获取 Babel 配置根对象  */
    const babelRoot = root.find<ObjectExpression>(
      j.ObjectExpression as AstType<ObjectExpression>,
      (node: ObjectExpression) => {
        const { properties } = node;
        return (properties as Property[]).some(
          (p) => identifier.check(p.key) && (p.key.name === 'presets' || p.key.name === 'plugins'),
        );
      },
    );

    /* 2. Babel 配置属性 */
    const properties: Collection<Property> = babelRoot.find<Property>(
      api.j.Property as AstType<Property>,
      (node: Property) => {
        const { key, value } = node;
        return (
          identifier.check(key) && arrayExpression.check(value) && (key.name === 'presets' || key.name === 'plugins')
        );
      },
    );

    /* 3. 确保 babel 配置存在 plugins 属性 */
    ensurePluginsProperty(properties, api);

    /* 4. 查找 plugins 配置节点 */
    const plugins = babelRoot.find<Property>(api.j.Property as AstType<Property>, (node: Property) => {
      const { key, value } = node;
      return identifier.check(key) && arrayExpression.check(value) && key.name === 'plugins';
    });

    /* 5. 查找按需引入插件配置节点 */
    const pluginNodes = plugins.find<ArrayExpression>(
      j.ArrayExpression as AstType<ArrayExpression>,
      (node: ArrayExpression) => {
        const { elements } = node;
        return elements.some((e) => !arrayExpression.check(e));
      },
    );

    const mergeOpts: CodeModOptions = { ...CODE_MOD_OPTIONS, ...opts };
    const { libraryName, remove } = mergeOpts;

    const pluginNode = pluginNodes.filter(({ node }) => {
      const { elements } = node;
      const name = elements[0] as Literal;
      const options = elements[1] as ObjectExpression;

      let result: boolean = literal.check(name) && name.value === 'import' && objectExpression.check(options);

      if (elements.length >= 3) {
        const id = elements[2] as Literal;
        result = result && literal.check(id) && id.value === libraryName;
      }

      return result;
    });

    /* 2. 移除插件配置或更新配置 */
    if (remove) {
      pluginNode.remove();
    } else {
      save(plugins, pluginNodes, pluginNode, api, mergeOpts);
    }

    return root.toSource();
  };
};

export default babelTransform;
