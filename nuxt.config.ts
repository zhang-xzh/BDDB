// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/devtools',
  ],

  // 组件自动导入
  components: {
    dirs: [
      '~/components',
    ],
    global: true,
  },

  // 组合式函数自动导入
  imports: {
    dirs: ['~/composables'],
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // 运行时配置
  runtimeConfig: {
    qbHost: process.env.QB_HOST || 'localhost:18000',
    qbUser: process.env.QB_USER || '',
    qbPass: process.env.QB_PASS || '',
  },

  // 忽略文件
  ignore: [
    '**/*.py',
    '**/bddb.sqlite',
  ],
})
