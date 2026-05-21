import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/tiposaurus-rex/',
  title: 'Tiposaurus Rex',
  description: 'TypeScript type generator for annotated MySQL SQL files',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'GitHub', link: 'https://github.com/e2cabral/tiposaurus-rex' },
      { text: 'Changelog', link: 'https://github.com/e2cabral/tiposaurus-rex/blob/main/CHANGELOG.md' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Tiposaurus Rex?', link: '/guide/what-is-tiposaurus' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'CLI Reference', link: '/guide/cli' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'SQL Annotations', link: '/guide/sql-annotations' },
          { text: 'Type Inference', link: '/guide/type-inference' },
          { text: 'Generated Output', link: '/guide/generated-output' },
          { text: 'Runtime Usage', link: '/guide/runtime-usage' },
        ],
      },
      {
        text: 'Customization',
        items: [
          { text: 'Templates', link: '/guide/templates' },
          { text: 'Advanced Usage', link: '/guide/advanced-usage' },
          { text: 'Examples', link: '/guide/examples' },
        ],
      },
      {
        text: 'Help',
        items: [
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'FAQ', link: '/guide/faq' },
          { text: 'Contributing', link: '/guide/contributing' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/e2cabral/tiposaurus-rex' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Edson Cabral Junior',
    },
  },
});
