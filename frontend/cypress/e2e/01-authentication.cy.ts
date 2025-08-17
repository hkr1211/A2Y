describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.visit('/login')
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  it('should display login page correctly', () => {
    cy.get('[data-cy="login-form"]').should('be.visible')
    cy.get('[data-cy="username-input"]').should('be.visible')
    cy.get('[data-cy="password-input"]').should('be.visible')
    cy.get('[data-cy="login-button"]').should('be.visible')
    cy.get('[data-cy="language-switcher"]').should('be.visible')
  })

  it('should show validation errors for empty fields', () => {
    cy.get('[data-cy="login-button"]').click()
    cy.get('.el-form-item__error').should('contain', '请输入用户名')
    cy.get('.el-form-item__error').should('contain', '请输入密码')
  })

  it('should show error for invalid credentials', () => {
    cy.get('[data-cy="username-input"]').type('invalid_user')
    cy.get('[data-cy="password-input"]').type('invalid_password')
    cy.get('[data-cy="login-button"]').click()
    
    cy.get('.el-message--error').should('contain', '用户名或密码错误')
  })

  it('should login successfully as admin', () => {
    cy.loginAsAdmin()
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="user-menu"]').should('contain', 'admin')
    cy.get('[data-cy="admin-features"]').should('be.visible')
  })

  it('should login successfully as buyer', () => {
    cy.seedTestData()
    cy.loginAsBuyer()
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="user-menu"]').should('contain', 'buyer_test')
    cy.get('[data-cy="buyer-features"]').should('be.visible')
  })

  it('should login successfully as supplier', () => {
    cy.seedTestData()
    cy.loginAsSupplier()
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="user-menu"]').should('contain', 'supplier_test')
    cy.get('[data-cy="supplier-features"]').should('be.visible')
  })

  it('should logout successfully', () => {
    cy.loginAsAdmin()
    cy.get('[data-cy="user-menu"]').click()
    cy.get('[data-cy="logout-button"]').click()
    cy.url().should('include', '/login')
  })

  it('should redirect to login when accessing protected routes without authentication', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/login')
    
    cy.visit('/inquiries')
    cy.url().should('include', '/login')
    
    cy.visit('/orders')
    cy.url().should('include', '/login')
  })

  it('should maintain session after page refresh', () => {
    cy.loginAsAdmin()
    cy.reload()
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="user-menu"]').should('contain', 'admin')
  })
})