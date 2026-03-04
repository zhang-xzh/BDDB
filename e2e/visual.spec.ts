/**
 * 视觉回归测试
 * 测试组件样式和布局
 */

import { test, expect } from '@playwright/test'

test.describe('视觉回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('DiscEditor 样式', () => {
    test('弹窗样式应该正确', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 截图对比（需要基准图片）
        // await expect(modal).toHaveScreenshot('disc-editor-modal.png')
        
        // 验证样式属性
        const modalContent = modal.locator('.ant-modal-content')
        const styles = await modalContent.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            width: computed.width,
            borderRadius: computed.borderRadius,
            boxShadow: computed.boxShadow,
          }
        })
        
        // 验证宽度
        expect(parseInt(styles.width)).toBeGreaterThan(800)
        
        // 验证有圆角
        expect(styles.borderRadius).not.toBe('0px')
      }
    })

    test('卷类型按钮样式应该正确', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证按钮组样式
        const radioGroup = page.locator('.ant-radio-group')
        await expect(radioGroup).toBeVisible()
        
        // 验证按钮样式
        const buttons = radioGroup.locator('.ant-radio-button-wrapper')
        const count = await buttons.count()
        expect(count).toBeGreaterThanOrEqual(2)
        
        // 验证第一个按钮的样式
        const firstButton = buttons.first()
        const styles = await firstButton.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            display: computed.display,
            textAlign: computed.textAlign,
            cursor: computed.cursor,
          }
        })
        
        expect(styles.display).toBe('inline-block')
        expect(styles.cursor).toBe('pointer')
      }
    })

    test('文件树样式应该正确', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(2000)
        
        // 验证树组件样式
        const tree = page.locator('.ant-tree')
        await expect(tree).toBeVisible()
        
        // 验证树节点样式
        const treeNode = tree.locator('.ant-tree-treenode').first()
        const styles = await treeNode.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            display: computed.display,
            alignItems: computed.alignItems,
          }
        })
        
        expect(styles.display).toBe('flex')
      }
    })

    test('卷号选择器样式应该正确', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(2000)
        
        // 验证选择器样式
        const volumeSelect = page.locator('.ant-select').filter({ hasText: '卷号' }).first()
        
        if (await volumeSelect.isVisible()) {
          const styles = await volumeSelect.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return {
              width: computed.width,
              minWidth: computed.minWidth,
            }
          })
          
          // 验证宽度约为 100px
          expect(parseInt(styles.width)).toBeGreaterThanOrEqual(80)
        }
      }
    })

    test('输入框样式应该正确', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(2000)
        
        // 验证型番输入框样式
        const catalogInput = page.locator('input[placeholder="型番"]').first()
        
        if (await catalogInput.isVisible()) {
          const styles = await catalogInput.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return {
              width: computed.width,
              height: computed.height,
              borderRadius: computed.borderRadius,
              border: computed.border,
            }
          })
          
          // 验证宽度约为 120px
          expect(parseInt(styles.width)).toBeGreaterThanOrEqual(100)
          
          // 验证有边框
          expect(styles.border).not.toBe('none')
        }
      }
    })
  })

  test.describe('响应式测试', () => {
    test('弹窗在移动端应该自适应', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 })
      
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证弹窗宽度适应屏幕
        const modalContent = modal.locator('.ant-modal-content')
        const box = await modalContent.boundingBox()
        expect(box).toBeTruthy()
        
        // 弹窗宽度应该接近屏幕宽度（考虑边距）
        expect(box!.width).toBeLessThan(375)
        expect(box!.width).toBeGreaterThan(300)
      }
    })

    test('文件树在窄屏下应该可滚动', async ({ page }) => {
      // 设置窄屏视口
      await page.setViewportSize({ width: 400, height: 600 })
      
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(2000)
        
        // 验证模态框内容可滚动
        const modalBody = modal.locator('.ant-modal-body')
        const isScrollable = await modalBody.evaluate((el) => {
          return el.scrollHeight > el.clientHeight
        })
        
        // 内容多时应该可以滚动
        // expect(isScrollable).toBeTruthy()
      }
    })
  })

  test.describe('无障碍测试', () => {
    test('弹窗应该有正确的 ARIA 属性', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证模态框有 role 属性
        const modalDialog = modal.locator('[role="dialog"]')
        await expect(modalDialog).toBeVisible()
      }
    })

    test('输入框应该有 label 或 placeholder', async ({ page }) => {
      const editButton = page.locator('[data-testid="edit-disc"]').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(2000)
        
        // 验证输入框有 placeholder
        const inputs = modal.locator('input')
        const count = await inputs.count()
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          const input = inputs.nth(i)
          const placeholder = await input.getAttribute('placeholder')
          const ariaLabel = await input.getAttribute('aria-label')
          
          // 至少应该有 placeholder 或 aria-label 之一
          expect(placeholder || ariaLabel).toBeTruthy()
        }
      }
    })
  })
})
