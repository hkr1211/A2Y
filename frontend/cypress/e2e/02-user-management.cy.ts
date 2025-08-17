describe('User Management', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.loginAsAdmin()
    cy.visit('/users')
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  it('should display users list correctly', () => {
    cy.waitForApiCall('@getUsers')
    cy.get('[data-cy="users-table"]').should('be.visible')
    cy.get('[data-cy="add-user-button"]').should('be.visible')
    cy.get('[data-cy="user-row"]').should('have.length.at.least', 1)
  })

  it('should create a new buyer user', () => {
    cy.get('[data-cy="add-user-button"]').click()
    cy.get('[data-cy="user-form-dialog"]').should('be.visible')
    
    cy.get('[data-cy="username-input"]').type('new_buyer')
    cy.get('[data-cy="password-input"]').type('password123')
    cy.get('[data-cy="role-select"]').click()
    cy.get('[data-cy="role-option-buyer"]').click()
    cy.get('[data-cy="company-select"]').click()
    cy.get('[data-cy="company-option-arroz"]').click()
    
    cy.get('[data-cy="save-user-button"]').click()
    cy.waitForApiCall('@createUser')
    
    cy.get('.el-message--success').should('contain', '用户创建成功')
    cy.get('[data-cy="user-form-dialog"]').should('not.exist')
    cy.get('[data-cy="users-table"]').should('contain', 'new_buyer')
  })

  it('should create a new supplier user', () => {
    cy.get('[data-cy="add-user-button"]').click()
    cy.get('[data-cy="user-form-dialog"]').should('be.visible')
    
    cy.get('[data-cy="username-input"]').type('new_supplier')
    cy.get('[data-cy="password-input"]').type('password123')
    cy.get('[data-cy="role-select"]').click()
    cy.get('[data-cy="role-option-supplier"]').click()
    cy.get('[data-cy="company-select"]').click()
    cy.get('[data-cy="company-option-yunjie"]').click()
    
    cy.get('[data-cy="save-user-button"]').click()
    cy.waitForApiCall('@createUser')
    
    cy.get('.el-message--success').should('contain', '用户创建成功')
    cy.get('[data-cy="users-table"]').should('contain', 'new_supplier')
  })

  it('should edit an existing user', () => {
    cy.get('[data-cy="user-row"]').first().within(() => {
      cy.get('[data-cy="edit-user-button"]').click()
    })
    
    cy.get('[data-cy="user-form-dialog"]').should('be.visible')
    cy.get('[data-cy="username-input"]').should('be.disabled')
    
    cy.get('[data-cy="password-input"]').clear().type('newpassword123')
    cy.get('[data-cy="save-user-button"]').click()
    cy.waitForApiCall('@updateUser')
    
    cy.get('.el-message--success').should('contain', '用户更新成功')
    cy.get('[data-cy="user-form-dialog"]').should('not.exist')
  })

  it('should delete a user', () => {
    // First create a test user to delete
    cy.get('[data-cy="add-user-button"]').click()
    cy.get('[data-cy="username-input"]').type('user_to_delete')
    cy.get('[data-cy="password-input"]').type('password123')
    cy.get('[data-cy="role-select"]').click()
    cy.get('[data-cy="role-option-buyer"]').click()
    cy.get('[data-cy="company-select"]').click()
    cy.get('[data-cy="company-option-arroz"]').click()
    cy.get('[data-cy="save-user-button"]').click()
    cy.waitForApiCall('@createUser')
    
    // Now delete the user
    cy.get('[data-cy="users-table"]').contains('user_to_delete').parents('[data-cy="user-row"]').within(() => {
      cy.get('[data-cy="delete-user-button"]').click()
    })
    
    cy.get('[data-cy="confirm-dialog"]').should('be.visible')
    cy.get('[data-cy="confirm-delete-button"]').click()
    cy.waitForApiCall('@deleteUser')
    
    cy.get('.el-message--success').should('contain', '用户删除成功')
    cy.get('[data-cy="users-table"]').should('not.contain', 'user_to_delete')
  })

  it('should validate user form fields', () => {
    cy.get('[data-cy="add-user-button"]').click()
    cy.get('[data-cy="save-user-button"]').click()
    
    cy.get('.el-form-item__error').should('contain', '请输入用户名')
    cy.get('.el-form-item__error').should('contain', '请输入密码')
    cy.get('.el-form-item__error').should('contain', '请选择角色')
    cy.get('.el-form-item__error').should('contain', '请选择公司')
  })

  it('should filter users by role', () => {
    cy.get('[data-cy="role-filter"]').click()
    cy.get('[data-cy="role-filter-buyer"]').click()
    
    cy.get('[data-cy="user-row"]').each(($row) => {
      cy.wrap($row).should('contain', '买方')
    })
    
    cy.get('[data-cy="role-filter"]').click()
    cy.get('[data-cy="role-filter-supplier"]').click()
    
    cy.get('[data-cy="user-row"]').each(($row) => {
      cy.wrap($row).should('contain', '供应商')
    })
  })

  it('should search users by username', () => {
    cy.get('[data-cy="search-input"]').type('admin')
    cy.get('[data-cy="search-button"]').click()
    
    cy.get('[data-cy="user-row"]').should('have.length', 1)
    cy.get('[data-cy="user-row"]').should('contain', 'admin')
  })
})