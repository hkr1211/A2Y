describe('Inquiry Management', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.seedTestData()
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  describe('As Buyer User', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
    })

    it('should display inquiries list correctly', () => {
      cy.waitForApiCall('@getInquiries')
      cy.get('[data-cy="inquiries-table"]').should('be.visible')
      cy.get('[data-cy="add-inquiry-button"]').should('be.visible')
      cy.get('[data-cy="inquiry-row"]').should('have.length.at.least', 1)
    })

    it('should create a new inquiry', () => {
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="inquiry-form-dialog"]').should('be.visible')
      
      cy.get('[data-cy="product-name-input"]').type('Test Product')
      cy.get('[data-cy="material-type-input"]').type('Aluminum')
      cy.get('[data-cy="specifications-input"]').type('200x100x50mm')
      cy.get('[data-cy="special-requirements-input"]').type('High precision required')
      cy.get('[data-cy="quantity-input"]').type('500')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      cy.get('.el-message--success').should('contain', '询单创建成功')
      cy.get('[data-cy="inquiry-form-dialog"]').should('not.exist')
      cy.get('[data-cy="inquiries-table"]').should('contain', 'Test Product')
    })

    it('should upload attachments when creating inquiry', () => {
      cy.get('[data-cy="add-inquiry-button"]').click()
      
      cy.get('[data-cy="product-name-input"]').type('Product with Attachment')
      cy.get('[data-cy="material-type-input"]').type('Steel')
      cy.get('[data-cy="specifications-input"]').type('100x100x100mm')
      cy.get('[data-cy="quantity-input"]').type('100')
      
      // Mock file upload
      cy.get('[data-cy="file-upload"]').selectFile('cypress/fixtures/test-image.jpg', { force: true })
      cy.get('[data-cy="uploaded-file"]').should('contain', 'test-image.jpg')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      cy.get('.el-message--success').should('contain', '询单创建成功')
    })

    it('should edit inquiry when not replied', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已发布')
        cy.get('[data-cy="edit-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="inquiry-form-dialog"]').should('be.visible')
      cy.get('[data-cy="product-name-input"]').clear().type('Updated Product Name')
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@updateInquiry')
      
      cy.get('.el-message--success').should('contain', '询单更新成功')
      cy.get('[data-cy="inquiries-table"]').should('contain', 'Updated Product Name')
    })

    it('should not allow editing inquiry when replied', () => {
      // First, simulate a replied inquiry
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已回复')
        cy.get('[data-cy="edit-inquiry-button"]').should('be.disabled')
      })
    })

    it('should cancel inquiry when not replied', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已发布')
        cy.get('[data-cy="cancel-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-cancel-button"]').click()
      cy.waitForApiCall('@updateInquiry')
      
      cy.get('.el-message--success').should('contain', '询单已作废')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已作废')
      })
    })

    it('should view inquiry details', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="inquiry-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="inquiry-number"]').should('be.visible')
      cy.get('[data-cy="product-name"]').should('be.visible')
      cy.get('[data-cy="material-type"]').should('be.visible')
      cy.get('[data-cy="specifications"]').should('be.visible')
      cy.get('[data-cy="quantity"]').should('be.visible')
      cy.get('[data-cy="created-date"]').should('be.visible')
    })

    it('should filter inquiries by status', () => {
      cy.get('[data-cy="status-filter"]').click()
      cy.get('[data-cy="status-filter-published"]').click()
      
      cy.get('[data-cy="inquiry-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="inquiry-status"]').should('contain', '已发布')
        })
      })
    })

    it('should search inquiries by product name', () => {
      cy.get('[data-cy="search-input"]').type('Test Product')
      cy.get('[data-cy="search-button"]').click()
      
      cy.get('[data-cy="inquiry-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'Test Product')
      })
    })
  })

  describe('As Supplier User', () => {
    beforeEach(() => {
      cy.loginAsSupplier()
      cy.visit('/inquiries')
    })

    it('should view all inquiries but only reply to them', () => {
      cy.waitForApiCall('@getInquiries')
      cy.get('[data-cy="inquiries-table"]').should('be.visible')
      cy.get('[data-cy="add-inquiry-button"]').should('not.exist')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').should('be.visible')
        cy.get('[data-cy="edit-inquiry-button"]').should('not.exist')
        cy.get('[data-cy="delete-inquiry-button"]').should('not.exist')
      })
    })

    it('should reply to inquiry with quotation', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="quotation-form-dialog"]').should('be.visible')
      cy.get('[data-cy="unit-price-input"]').type('25.50')
      cy.get('[data-cy="delivery-time-input"]').type('30')
      cy.get('[data-cy="remarks-input"]').type('Best quality materials')
      
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      cy.get('.el-message--success').should('contain', '报价提交成功')
      cy.get('[data-cy="quotation-form-dialog"]').should('not.exist')
    })

    it('should view quotation details for replied inquiry', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已回复')
        cy.get('[data-cy="view-quotation-button"]').click()
      })
      
      cy.get('[data-cy="quotation-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="unit-price"]').should('be.visible')
      cy.get('[data-cy="total-price"]').should('be.visible')
      cy.get('[data-cy="delivery-time"]').should('be.visible')
    })
  })

  describe('As Admin User', () => {
    beforeEach(() => {
      cy.loginAsAdmin()
      cy.visit('/inquiries')
    })

    it('should view all inquiries and have delete permissions', () => {
      cy.waitForApiCall('@getInquiries')
      cy.get('[data-cy="inquiries-table"]').should('be.visible')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="delete-inquiry-button"]').should('be.visible')
      })
    })

    it('should delete any inquiry', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="delete-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-delete-button"]').click()
      cy.waitForApiCall('@deleteInquiry')
      
      cy.get('.el-message--success').should('contain', '询单删除成功')
    })
  })
})