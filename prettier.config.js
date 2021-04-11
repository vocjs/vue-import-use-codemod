module.exports = {
  printWidth: 120, // 单行输出（不折行）的（最大）长度
  trailingComma: 'all', // 在任何可能的多行中输入尾逗号
  bracketSpacing: true, // 在对象字面量声明所使用的的花括号后（{）和前（}）输出空格
  singleQuote: true,
  jsxBracketSameLine: true, // 在多行JSX元素最后一行的末尾添加 > 而使 > 单独一行（不适用于自闭和元素）
  overrides: [
    {
      files: ['*.json'],
      options: {
        parser: 'json',
        singleQuote: false,
      },
    },
    {
      files: ['*.ejs', '*.html'],
      options: {
        parser: 'html',
      },
    },
  ],
};
