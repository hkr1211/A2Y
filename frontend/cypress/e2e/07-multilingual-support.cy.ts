describe('Multilingual Support', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.seedTestData()
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  describe('Language Switching', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('should display language switcher on login page', () => {
      cy.get('[data-cy="language-switcher"]').should('be.visible')
      cy.get('[data-cy="language-switcher"]').should('contain', '中文')
    })

    it('should switch from Chinese to Japanese', () => {
      cy.switchLanguage('ja')
      
      // Check that UI elements are now in Japanese
      cy.get('[data-cy="login-title"]').should('contain', 'ログイン')
      cy.get('[data-cy="username-label"]').should('contain', 'ユーザー名')
      cy.get('[data-cy="password-label"]').should('contain', 'パスワード')
      cy.get('[data-cy="login-button"]').should('contain', 'ログイン')
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
    })

    it('should switch from Japanese to Chinese', () => {
      cy.switchLanguage('ja')
      cy.switchLanguage('zh')
      
      // Check that UI elements are back to Chinese
      cy.get('[data-cy="login-title"]').should('contain', '登录')
      cy.get('[data-cy="username-label"]').should('contain', '用户名')
      cy.get('[data-cy="password-label"]').should('contain', '密码')
      cy.get('[data-cy="login-button"]').should('contain', '登录')
      cy.get('[data-cy="language-switcher"]').should('contain', '中文')
    })

    it('should persist language preference after page refresh', () => {
      cy.switchLanguage('ja')
      cy.reload()
      
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
      cy.get('[data-cy="login-title"]').should('contain', 'ログイン')
    })

    it('should maintain language preference after login', () => {
      cy.switchLanguage('ja')
      cy.loginAsAdmin()
      
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
      cy.get('[data-cy="dashboard-title"]').should('contain', 'ダッシュボード')
    })
  })

  describe('User Language Preference', () => {
    it('should save language preference to user profile', () => {
      cy.loginAsAdmin()
      cy.switchLanguage('ja')
      
      // Check that the preference is saved via API call
      cy.intercept('PUT', '/api/users/*/language').as('updateLanguage')
      cy.wait('@updateLanguage')
      
      // Logout and login again to verify persistence
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsAdmin()
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
    })

    it('should restore user language preference on login', () => {
      // First, set Japanese as preference
      cy.loginAsAdmin()
      cy.switchLanguage('ja')
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      // Login again and verify Japanese is restored
      cy.loginAsAdmin()
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
      cy.get('[data-cy="dashboard-title"]').should('contain', 'ダッシュボード')
    })

    it('should use default language for new users', () => {
      cy.loginAsAdmin()
      cy.visit('/users')
      
      // Create a new user
      cy.get('[data-cy="add-user-button"]').click()
      cy.get('[data-cy="username-input"]').type('new_test_user')
      cy.get('[data-cy="password-input"]').type('password123')
      cy.get('[data-cy="role-select"]').click()
      cy.get('[data-cy="role-option-buyer"]').click()
      cy.get('[data-cy="company-select"]').click()
      cy.get('[data-cy="company-option-arroz"]').click()
      cy.get('[data-cy="save-user-button"]').click()
      
      // Logout and login as new user
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.login('new_test_user', 'password123')
      cy.get('[data-cy="language-switcher"]').should('contain', '中文')
    })
  })

  describe('Interface Translation', () => {
    beforeEach(() => {
      cy.loginAsAdmin()
    })

    it('should translate dashboard interface correctly', () => {
      cy.visit('/dashboard')
      
      // Test Chinese interface
      cy.get('[data-cy="dashboard-title"]').should('contain', '仪表板')
      cy.get('[data-cy="total-users-card"]').should('contain', '总用户数')
      cy.get('[data-cy="total-inquiries-card"]').should('contain', '总询单数')
      cy.get('[data-cy="active-orders-card"]').should('contain', '活跃订单数')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="dashboard-title"]').should('contain', 'ダッシュボード')
      cy.get('[data-cy="total-users-card"]').should('contain', '総ユーザー数')
      cy.get('[data-cy="total-inquiries-card"]').should('contain', '総照会数')
      cy.get('[data-cy="active-orders-card"]').should('contain', 'アクティブ注文数')
    })

    it('should translate navigation menu correctly', () => {
      cy.visit('/dashboard')
      
      // Test Chinese navigation
      cy.get('[data-cy="nav-dashboard"]').should('contain', '仪表板')
      cy.get('[data-cy="nav-users"]').should('contain', '用户管理')
      cy.get('[data-cy="nav-inquiries"]').should('contain', '询单管理')
      cy.get('[data-cy="nav-quotations"]').should('contain', '报价管理')
      cy.get('[data-cy="nav-orders"]').should('contain', '订单管理')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="nav-dashboard"]').should('contain', 'ダッシュボード')
      cy.get('[data-cy="nav-users"]').should('contain', 'ユーザー管理')
      cy.get('[data-cy="nav-inquiries"]').should('contain', '照会管理')
      cy.get('[data-cy="nav-quotations"]').should('contain', '見積もり管理')
      cy.get('[data-cy="nav-orders"]').should('contain', '注文管理')
    })

    it('should translate form labels and buttons correctly', () => {
      cy.visit('/users')
      cy.get('[data-cy="add-user-button"]').click()
      
      // Test Chinese form
      cy.get('[data-cy="username-label"]').should('contain', '用户名')
      cy.get('[data-cy="password-label"]').should('contain', '密码')
      cy.get('[data-cy="role-label"]').should('contain', '角色')
      cy.get('[data-cy="company-label"]').should('contain', '公司')
      cy.get('[data-cy="save-user-button"]').should('contain', '保存')
      cy.get('[data-cy="cancel-button"]').should('contain', '取消')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="username-label"]').should('contain', 'ユーザー名')
      cy.get('[data-cy="password-label"]').should('contain', 'パスワード')
      cy.get('[data-cy="role-label"]').should('contain', '役割')
      cy.get('[data-cy="company-label"]').should('contain', '会社')
      cy.get('[data-cy="save-user-button"]').should('contain', '保存')
      cy.get('[data-cy="cancel-button"]').should('contain', 'キャンセル')
    })

    it('should translate table headers correctly', () => {
      cy.visit('/inquiries')
      
      // Test Chinese table headers
      cy.get('[data-cy="table-header-inquiry-number"]').should('contain', '询单号')
      cy.get('[data-cy="table-header-product-name"]').should('contain', '产品名称')
      cy.get('[data-cy="table-header-material-type"]').should('contain', '材料类型')
      cy.get('[data-cy="table-header-quantity"]').should('contain', '数量')
      cy.get('[data-cy="table-header-status"]').should('contain', '状态')
      cy.get('[data-cy="table-header-created-date"]').should('contain', '创建日期')
      cy.get('[data-cy="table-header-actions"]').should('contain', '操作')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="table-header-inquiry-number"]').should('contain', '照会番号')
      cy.get('[data-cy="table-header-product-name"]').should('contain', '製品名')
      cy.get('[data-cy="table-header-material-type"]').should('contain', '材料タイプ')
      cy.get('[data-cy="table-header-quantity"]').should('contain', '数量')
      cy.get('[data-cy="table-header-status"]').should('contain', 'ステータス')
      cy.get('[data-cy="table-header-created-date"]').should('contain', '作成日')
      cy.get('[data-cy="table-header-actions"]').should('contain', 'アクション')
    })

    it('should translate status values correctly', () => {
      cy.visit('/inquiries')
      
      // Test Chinese status values
      cy.get('[data-cy="inquiry-status"]').should('contain', '已发布')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="inquiry-status"]').should('contain', '公開済み')
    })

    it('should translate error messages correctly', () => {
      cy.visit('/users')
      cy.get('[data-cy="add-user-button"]').click()
      cy.get('[data-cy="save-user-button"]').click()
      
      // Test Chinese error messages
      cy.get('.el-form-item__error').should('contain', '请输入用户名')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      cy.get('[data-cy="save-user-button"]').click()
      
      cy.get('.el-form-item__error').should('contain', 'ユーザー名を入力してください')
    })

    it('should translate success messages correctly', () => {
      cy.visit('/users')
      cy.get('[data-cy="add-user-button"]').click()
      
      cy.get('[data-cy="username-input"]').type('test_user_msg')
      cy.get('[data-cy="password-input"]').type('password123')
      cy.get('[data-cy="role-select"]').click()
      cy.get('[data-cy="role-option-buyer"]').click()
      cy.get('[data-cy="company-select"]').click()
      cy.get('[data-cy="company-option-arroz"]').click()
      cy.get('[data-cy="save-user-button"]').click()
      
      // Test Chinese success message
      cy.get('.el-message--success').should('contain', '用户创建成功')
      
      // Switch to Japanese and create another user
      cy.switchLanguage('ja')
      cy.get('[data-cy="add-user-button"]').click()
      
      cy.get('[data-cy="username-input"]').type('test_user_msg_ja')
      cy.get('[data-cy="password-input"]').type('password123')
      cy.get('[data-cy="role-select"]').click()
      cy.get('[data-cy="role-option-buyer"]').click()
      cy.get('[data-cy="company-select"]').click()
      cy.get('[data-cy="company-option-arroz"]').click()
      cy.get('[data-cy="save-user-button"]').click()
      
      cy.get('.el-message--success').should('contain', 'ユーザーが正常に作成されました')
    })
  })

  describe('Content Translation', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
    })

    it('should display inquiry content in correct language', () => {
      cy.visit('/inquiries')
      cy.get('[data-cy="add-inquiry-button"]').click()
      
      // Create inquiry in Chinese
      cy.get('[data-cy="product-name-input"]').type('测试产品')
      cy.get('[data-cy="material-type-input"]').type('不锈钢')
      cy.get('[data-cy="specifications-input"]').type('100x50x20毫米')
      cy.get('[data-cy="special-requirements-input"]').type('需要高精度加工')
      cy.get('[data-cy="quantity-input"]').type('100')
      cy.get('[data-cy="save-inquiry-button"]').click()
      
      // Verify content is displayed correctly
      cy.get('[data-cy="inquiries-table"]').should('contain', '测试产品')
      cy.get('[data-cy="inquiries-table"]').should('contain', '不锈钢')
      
      // Switch to Japanese interface
      cy.switchLanguage('ja')
      
      // Content should remain in original language but interface should be Japanese
      cy.get('[data-cy="inquiries-table"]').should('contain', '测试产品')
      cy.get('[data-cy="table-header-product-name"]').should('contain', '製品名')
    })

    it('should handle mixed language content correctly', () => {
      cy.visit('/inquiries')
      cy.get('[data-cy="add-inquiry-button"]').click()
      
      // Create inquiry with mixed language content
      cy.get('[data-cy="product-name-input"]').type('Test Product テスト製品')
      cy.get('[data-cy="material-type-input"]').type('Aluminum アルミニウム')
      cy.get('[data-cy="specifications-input"]').type('Size: 200x100x50mm サイズ：200x100x50mm')
      cy.get('[data-cy="quantity-input"]').type('50')
      cy.get('[data-cy="save-inquiry-button"]').click()
      
      // Verify mixed content is displayed correctly
      cy.get('[data-cy="inquiries-table"]').should('contain', 'Test Product テスト製品')
      cy.get('[data-cy="inquiries-table"]').should('contain', 'Aluminum アルミニウム')
    })
  })

  describe('Date and Number Formatting', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
    })

    it('should format dates according to language locale', () => {
      cy.visit('/inquiries')
      
      // Check Chinese date format (YYYY-MM-DD)
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="created-date"]').should('match', /\d{4}-\d{2}-\d{2}/)
      })
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      // Check Japanese date format (YYYY年MM月DD日)
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="created-date"]').should('match', /\d{4}年\d{1,2}月\d{1,2}日/)
      })
    })

    it('should format numbers according to language locale', () => {
      cy.visit('/orders')
      
      // Check Chinese number format
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="total-price"]').should('match', /¥[\d,]+\.\d{2}/)
      })
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      // Check Japanese number format
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="total-price"]').should('match', /¥[\d,]+/)
      })
    })
  })

  describe('Language Switching Edge Cases', () => {
    it('should handle language switching during form input', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      cy.get('[data-cy="add-inquiry-button"]').click()
      
      // Start filling form in Chinese
      cy.get('[data-cy="product-name-input"]').type('测试产品')
      cy.get('[data-cy="material-type-input"]').type('钢材')
      
      // Switch language mid-form
      cy.switchLanguage('ja')
      
      // Form should maintain input values but labels should change
      cy.get('[data-cy="product-name-input"]').should('have.value', '测试产品')
      cy.get('[data-cy="material-type-input"]').should('have.value', '钢材')
      cy.get('[data-cy="product-name-label"]').should('contain', '製品名')
      cy.get('[data-cy="material-type-label"]').should('contain', '材料タイプ')
    })

    it('should handle language switching during chat', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      
      // Send message in Chinese
      cy.get('[data-cy="message-input"]').type('这是中文消息')
      cy.get('[data-cy="send-button"]').click()
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      // Previous messages should remain, interface should change
      cy.get('[data-cy="message-item"]').should('contain', '这是中文消息')
      cy.get('[data-cy="chat-header"]').should('contain', '照会コミュニケーション')
      
      // Send message in Japanese
      cy.get('[data-cy="message-input"]').type('これは日本語のメッセージです')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').should('contain', 'これは日本語のメッセージです')
    })

    it('should handle browser language detection', () => {
      // This test would check if the system detects browser language on first visit
      cy.clearLocalStorage()
      cy.clearCookies()
      
      // Mock browser language to Japanese
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'language', {
          value: 'ja-JP',
          configurable: true
        })
      })
      
      cy.visit('/login')
      
      // Should default to Japanese based on browser language
      cy.get('[data-cy="language-switcher"]').should('contain', '日本語')
      cy.get('[data-cy="login-title"]').should('contain', 'ログイン')
    })
  })

  describe('Accessibility with Multiple Languages', () => {
    it('should maintain accessibility attributes in both languages', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      // Check Chinese accessibility
      cy.get('[data-cy="add-inquiry-button"]').should('have.attr', 'aria-label', '添加询单')
      
      // Switch to Japanese
      cy.switchLanguage('ja')
      
      // Check Japanese accessibility
      cy.get('[data-cy="add-inquiry-button"]').should('have.attr', 'aria-label', '照会を追加')
    })

    it('should announce language changes to screen readers', () => {
      cy.visit('/login')
      
      // Check for aria-live region for language changes
      cy.get('[data-cy="language-announcement"]').should('exist')
      
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="language-announcement"]').should('contain', '言語が日本語に変更されました')
    })
  })
})