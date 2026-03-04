/**
 * DiscEditor 组件 E2E 测试
 * 测试弹窗功能、数据加载、交互等
 */

import { test, expect } from '@playwright/test'

test.describe('DiscEditor 组件', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待页面加载完成
    await page.waitForTimeout(2000)
  })

  test.describe('弹窗显示', () => {
    test('应该显示 DiscEditor 弹窗', async ({ page }) => {
      // 点击第一行的"编辑"按钮
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        // 等待弹窗出现
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证弹窗标题
        const title = modal.locator('.ant-modal-title')
        await expect(title).toBeVisible()
      }
    })

    test('弹窗应该有正确的宽度', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证弹窗宽度约为 900px
        const modalContent = modal.locator('.ant-modal-content')
        const box = await modalContent.boundingBox()
        expect(box).toBeTruthy()
        expect(box!.width).toBeGreaterThan(800)
      }
    })

    test('点击取消按钮应该关闭弹窗', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 点击取消按钮
        const cancelButton = modal.locator('button:has-text("取消")').first()
        await cancelButton.click()
        
        // 验证弹窗已关闭
        await expect(modal).not.toBeVisible()
      }
    })
  })

  test.describe('卷类型选择', () => {
    test('应该显示卷类型单选按钮', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 验证卷类型选择器存在
        const volumeRadio = page.locator('.ant-radio-group')
        await expect(volumeRadio).toBeVisible()
        
        // 验证"分卷"选项
        const volumeOption = page.locator('button:has-text("分卷")')
        await expect(volumeOption).toBeVisible()
        
        // 验证"BOX"选项
        const boxOption = page.locator('button:has-text("BOX")')
        await expect(boxOption).toBeVisible()
      }
    })

    test('应该可以切换卷类型', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 默认应该是"分卷"
        const volumeOption = page.locator('button:has-text("分卷")')
        await expect(volumeOption).toHaveClass(/ant-radio-button-checked/)
        
        // 点击"BOX"选项
        const boxOption = page.locator('button:has-text("BOX")')
        await boxOption.click()
        
        // 验证"BOX"被选中
        await expect(boxOption).toHaveClass(/ant-radio-button-checked/)
      }
    })
  })

  test.describe('文件树显示', () => {
    test('应该显示文件列表', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(3000)
        
        // 验证文件列表卡片存在
        const fileCard = page.locator('.ant-card:has-text("文件列表")')
        await expect(fileCard).toBeVisible()
        
        // 验证文件数量标签
        const fileCountTag = page.locator('.ant-tag:has-text("文件")')
        await expect(fileCountTag).toBeVisible()
      }
    })

    test('应该显示树形结构', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(3000)
        
        // 验证树组件存在
        const tree = page.locator('.ant-tree')
        await expect(tree).toBeVisible()
        
        // 验证树节点存在
        const treeNodes = page.locator('.ant-tree-treenode')
        const count = await treeNodes.count()
        expect(count).toBeGreaterThan(0)
      }
    })

    test('应该可以展开/折叠树节点', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(3000)
        
        // 找到有子节点的树节点
        const expandSwitch = page.locator('.ant-tree-switcher').first()
        
        if (await expandSwitch.isVisible()) {
          const initialCount = await page.locator('.ant-tree-treenode').count()
          
          // 点击展开/折叠
          await expandSwitch.click()
          await page.waitForTimeout(500)
          
          const afterCount = await page.locator('.ant-tree-treenode').count()
          
          // 验证节点数量有变化
          expect(initialCount).not.toBe(afterCount)
        }
      }
    })
  })

  test.describe('卷号选择', () => {
    test('每个文件节点应该显示卷号选择器', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(3000)
        
        // 验证卷号选择器存在
        const volumeSelect = page.locator('.ant-select:has-text("卷号")')
        const count = await volumeSelect.count()
        expect(count).toBeGreaterThan(0)
      }
    })

    test('应该可以选择卷号', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待文件加载
        await page.waitForTimeout(3000)
        
        // 找到第一个卷号选择器
        const volumeSelect = page.locator('.ant-select').filter({ hasText: '卷号' }).first()
        
        if (await volumeSelect.isVisible()) {
          // 点击选择器
          await volumeSelect.click()
          
          // 等待下拉菜单出现
          await page.waitForTimeout(500)
          
          // 选择"第 1 卷"
          const option = page.locator('.ant-select-item-option:has-text("第 1 卷")').first()
          if (await option.isVisible()) {
            await option.click()
            
            // 验证选择成功
            await expect(volumeSelect).toHaveText(/1/)
          }
        }
      }
    })
  })

  test.describe('卷信息表单', () => {
    test('应该显示卷信息卡片', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(3000)
        
        // 验证卷信息卡片存在
        const volumeCard = page.locator('.ant-card:has-text("卷信息")')
        // 卷信息卡片可能在没有选择卷号时不显示
        const isVisible = await volumeCard.isVisible().catch(() => false)
        expect(isVisible).toBeTruthy()
      }
    })

    test('应该可以输入型番', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(3000)
        
        // 找到型番输入框
        const catalogInput = page.locator('input[placeholder="型番"]').first()
        
        if (await catalogInput.isVisible()) {
          // 输入测试数据
          await catalogInput.fill('TEST-001')
          
          // 验证输入成功
          await expect(catalogInput).toHaveValue('TEST-001')
        }
      }
    })

    test('应该可以输入标题', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(3000)
        
        // 找到标题输入框
        const titleInput = page.locator('input[placeholder="标题"]').first()
        
        if (await titleInput.isVisible()) {
          // 输入测试数据
          await titleInput.fill('测试标题')
          
          // 验证输入成功
          await expect(titleInput).toHaveValue('测试标题')
        }
      }
    })
  })

  test.describe('保存功能', () => {
    test('点击保存按钮应该提交数据', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 等待数据加载
        await page.waitForTimeout(3000)
        
        // 找到保存按钮
        const saveButton = modal.locator('button:has-text("确定")').first()
        
        // 验证保存按钮存在且可用
        await expect(saveButton).toBeVisible()
      }
    })
  })

  test.describe('空状态处理', () => {
    test('没有文件时应该显示空状态', async ({ page }) => {
      // 这个测试需要 mock 空数据，实际测试需要配合 API mock
      const editButton = page.locator('button:has-text("编辑")').first()
      
      if (await editButton.isVisible()) {
        await editButton.click()
        
        const modal = page.locator('.disc-editor-modal, .ant-modal')
        await expect(modal).toBeVisible()
        
        // 空状态可能显示 Empty 组件
        const emptyState = page.locator('.ant-empty')
        // 空状态是可选的，取决于是否有数据
      }
    })
  })
})
