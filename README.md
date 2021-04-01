# vue-import-use-codemod

## 组件库全量导入，按需导入转换插件

## 开发此转换插件的背景

1. GeneratorAPI 的 injectImports 不能正确导入样式问题
2. 在多次调用插件时会有重复导入的现象
3. 在组件库全量导入或按需导入切换时，入口文件(main.ts | main.js) 和 babel.config.js 中相关代码修改不及时导致项目启动失败
4. @vue/cli 插件开发代码转换逻辑存在重复劳动力

## 组件库引入转换模块诞生

基于以上原因，本插件应运而生, 主要基于 [babel-plugin-import](https://www.npmjs.com/package/babel-plugin-import) 
, [jscodeshift](https://www.npmjs.com/package/jscodeshift) 使用 TypeScript 进行开发

## 使用此模块的项目

1. [vue-cli-plugin-antd](https://www.npmjs.com/package/vue-cli-plugin-antd)
2. [vue-cli-plugin-pro-layout](https://www.npmjs.com/package/vue-cli-plugin-pro-layout)

## 参数说明及Demo

```typescript
export type CodeModOptions = {
  /**
   * @description 组件库名称
   */
  libraryName: string;

  /**
   * @description 组件库目录
   * @default es
   */
  libraryDirectory?: string;

  /**
   * @description 组件导入名称
   */
  importName: string;

  /**
   * @description 是否默认导入
   * @default true
   */
  defaultImport?: boolean;

  /**
   * @description 样式信息描述,若是字符串的话，则表示的是样式文件的名称
   */
  style?: StyleInfo | string | false;

  /**
   * @description 是否移除已存在代码
   * @default false
   */
  remove?: boolean;

  /**
   * @description 需要额外传递给 Babel 插件的参数,排除 libraryName | libraryDirectory | style
   */
  babelPluginOptions?: Record<string, any>;

  [key: string]: any;
};

export type StyleInfo = {
  /**
   * @description 样式文件目录
   * @default dist
   */
  dir?: string;

  /**
   * @description 样式文件名称
   */
  name: string;

  /**
   * @description 样式文件后缀
   * @default less
   */
  suffix?: 'css' | 'less';
};
```

```typescript
import {useTransform, babelTransform} from 'vue-import-use-codemod';

const codeModOptions: CodeModOptions = {
  importName: 'ProLayout',
  libraryName: '@antd-vue/pro-layout',
  style: {
    dir: 'dist',
    name: 'layout',
    suffix: opts.style === true ? 'less' : 'css',
  },
};

/* 入口文件转换 */
const entryFileTransform = useTransform({
  ...codeModOptions,
  /* 按需引入时移除导入 */
  remove: opts.importType !== 'full',
});
api.transformScript(api.entryFile, entryFileTransform);

/* 转换 babel 配置文件 */
const babelConfigFileTransform = babelTransform({
  ...codeModOptions,
  /* 全量引入时移除插件 */
  remove: opts.importType === 'full',
  babelPluginOptions: {
    camel2DashComponentName: false,
  },
});
api.transformScript('babel.config.js', babelConfigFileTransform);

```

## TODO
