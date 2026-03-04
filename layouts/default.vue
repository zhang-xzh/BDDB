<template>
  <a-config-provider :locale="zhCN">
    <div class="layout">
      <a-layout>
        <a-layout-header class="header">
          <div class="logo">
            <h1>BDDB</h1>
          </div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            theme="dark"
            mode="horizontal"
            style="flex: 1; min-width: 0"
          >
            <a-menu-item key="1">首页</a-menu-item>
            <a-menu-item key="2">光盘管理</a-menu-item>
            <a-menu-item key="3">配置</a-menu-item>
          </a-menu>
        </a-layout-header>
        <a-layout-content class="content">
          <slot />
        </a-layout-content>
        <a-layout-footer class="footer">
          BDDB - Nuxt 3 Version © {{ new Date().getFullYear() }}
        </a-layout-footer>
      </a-layout>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const selectedKeys = ref(['1'])
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 24px;
}

.logo {
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
}

.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: calc(100vh - 184px);
}

.footer {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
}
</style>
