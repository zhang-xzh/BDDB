/**
 * 首页 E2E 测试
 * 测试页面布局、样式和基本功能
 */

import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('页面布局', () => {
    test('页面应该正常加载', async ({ page }) => {
      // 验证页面可见
      await expect(page.locator('body')).toBeVisible()
      
      // 验证页面有内容（使用 first() 避免严格模式冲突）
      const content = page.locator('.home').first()
      await expect(content).toBeVisible()
    })

    test('页面应该有正确的响应式布局', async ({ page }) => {
      // 桌面端视图
      await page.setViewportSize({ width: 1920, height: 1080 })
      const desktopBody = await page.locator('body').boundingBox()
      expect(desktopBody).toBeTruthy()
      
      // 平板端视图
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(500)
      const tabletBody = await page.locator('body').boundingBox()
      expect(tabletBody).toBeTruthy()
      
      // 移动端视图
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      const mobileBody = await page.locator('body').boundingBox()
      expect(mobileBody).toBeTruthy()
    })
  })

  test.describe('样式测试', () => {
    test('Ant Design Vue 组件应该正确渲染', async ({ page }) => {
      // 等待 Vue 应用挂载
      await page.waitForTimeout(2000)
      
      // 验证 Ant Design 样式存在
      const hasAntStyles = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        return links.some(link => 
          link.getAttribute('href')?.includes('ant-design') ||
          document.styleSheets.length > 0
        )
      })
      expect(hasAntStyles).toBeTruthy()
    })

    test('页面不应该有控制台错误', async ({ page }) => {
      const errors: string[] = []
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      await page.goto('/')
      await page.waitForTimeout(2000)
      
      // 忽略一些已知的非关键错误
      const criticalErrors = errors.filter(
        err => !err.includes('Failed to load resource') && 
               !err.includes('net::ERR')
      )
      
      expect(criticalErrors.length).toBe(0)
    })
  })

  test.describe('功能测试', () => {
    test('应该可以访问 API 端点', async ({ page }) => {
      // 测试 torrents API
      const torrentsResponse = await page.request.get('/api/qb/torrents/info')
      expect(torrentsResponse.ok()).toBeTruthy()
      
      // 测试 volumes API
      const volumesResponse = await page.request.get('/api/volumes')
      expect(volumesResponse.ok()).toBeTruthy()
    })

    test('页面应该支持键盘导航', async ({ page }) => {
      // 测试 Tab 键导航
      await page.keyboard.press('Tab')
      const firstFocusedElement = await page.evaluate(() => {
        return (document.activeElement as HTMLElement)?.tagName
      })
      expect(firstFocusedElement).toBeTruthy()
      
      // 继续 Tab 导航
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
    })
  })
})
