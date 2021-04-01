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

export const CODE_MOD_OPTIONS: CodeModOptions = {
  libraryName: '',
  libraryDirectory: 'es',
  importName: '',
  defaultImport: true,
  style: {
    dir: 'dist',
    name: '',
    suffix: 'less',
  },
  remove: false,
};
