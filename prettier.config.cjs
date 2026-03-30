module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.wxml',
      options: {
        parser: 'html',
      },
    },
    {
      files: '*.wxss',
      options: {
        parser: 'css',
      },
    },
  ],
};

