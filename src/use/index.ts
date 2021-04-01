import type { Collection, Transform } from 'jscodeshift';
import type { CodeModOptions } from '../options';
import library from './library';
import style from './style';
import use from './use';
import { CODE_MOD_OPTIONS } from '../options';

type UseTransform = (option: CodeModOptions) => Transform;

const useTransform: UseTransform = (opts) => {
  return (file, api) => {
    const j = api.jscodeshift;
    const root: Collection = j(file.source);
    const mergeOpts = { ...CODE_MOD_OPTIONS, ...opts };

    /* 1.导入组件 */
    library(root, api, mergeOpts);

    /* 2. 导入样式 */
    style(root, api, mergeOpts);

    /* 3. use 使用逻辑 */
    use(root, api, mergeOpts);

    return root.toSource();
  };
};

export default useTransform;
