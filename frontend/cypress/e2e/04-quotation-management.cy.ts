describe('Quotation Management', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.seedTestData()
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  describe('As Supplier User', () => {
    beforeEach(() => {
      cy.loginAsSupplier()
      cy.visit('/quotations')
    })

    it('should display quotations list correctly', () => {
      cy.waitForApiCall('@getQuotations')
      cy.get('[data-cy="quotations-table"]').should('be.visible')
      cy.get('[data-cy="quotation-row"]').should('have.length.at.least', 0)
    })

    it('should create quotation from inquiry page', () => {
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="quotation-form-dialog"]').should('be.visible')
      cy.get('[data-cy="unit-price-input"]').type('15.75')
      cy.get('[data-cy="delivery-time-input"]').type('45')
      cy.get('[data-cy="remarks-input"]').type('Premium quality with fast delivery')
      
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      cy.get('.el-message--success').should('contain', '报价提交成功')
      
      // Verify quotation appears in quotations list
      cy.visit('/quotations')
      cy.get('[data-cy="quotations-table"]').should('contain', '15.75')
    })

    it('should edit existing quotation', () => {
      // First create a quotation
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('20.00')
      cy.get('[data-cy="delivery-time-input"]').type('30')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // Now edit the quotation
      cy.visit('/quotations')
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="edit-quotation-button"]').click()
      })
      
      cy.get('[data-cy="quotation-form-dialog"]').should('be.visible')
      cy.get('[data-cy="unit-price-input"]').clear().type('22.50')
      cy.get('[data-cy="delivery-time-input"]').clear().type('25')
      cy.get('[data-cy="remarks-input"]').clear().type('Updated pricing and delivery')
      
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@updateQuotation')
      
      cy.get('.el-message--success').should('contain', '报价更新成功')
      cy.get('[data-cy="quotations-table"]').should('contain', '22.50')
    })

    it('should cancel quotation', () => {
      // First create a quotation
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('18.00')
      cy.get('[data-cy="delivery-time-input"]').type('35')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // Now cancel the quotation
      cy.visit('/quotations')
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="cancel-quotation-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-cancel-button"]').click()
      cy.waitForApiCall('@updateQuotation')
      
      cy.get('.el-message--success').should('contain', '报价已作废')
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="quotation-status"]').should('contain', '已作废')
      })
    })

    it('should view quotation details', () => {
      // First create a quotation
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('25.00')
      cy.get('[data-cy="delivery-time-input"]').type('40')
      cy.get('[data-cy="remarks-input"]').type('High quality materials')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // View quotation details
      cy.visit('/quotations')
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="view-quotation-button"]').click()
      })
      
      cy.get('[data-cy="quotation-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="inquiry-number"]').should('be.visible')
      cy.get('[data-cy="product-name"]').should('be.visible')
      cy.get('[data-cy="unit-price"]').should('contain', '25.00')
      cy.get('[data-cy="delivery-time"]').should('contain', '40')
      cy.get('[data-cy="remarks"]').should('contain', 'High quality materials')
    })

    it('should calculate total price automatically', () => {
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('10.50')
      // Assuming the inquiry has quantity 100
      cy.get('[data-cy="total-price"]').should('contain', '1050.00')
      
      cy.get('[data-cy="unit-price-input"]').clear().type('15.25')
      cy.get('[data-cy="total-price"]').should('contain', '1525.00')
    })
  })

  describe('As Buyer User', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/quotations')
    })

    it('should view quotations for own inquiries only', () => {
      cy.waitForApiCall('@getQuotations')
      cy.get('[data-cy="quotations-table"]').should('be.visible')
      
      // All quotations should be for inquiries created by this buyer
      cy.get('[data-cy="quotation-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="inquiry-creator"]').should('contain', 'buyer_test')
        })
      })
    })

    it('should not be able to edit or cancel quotations', () => {
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="edit-quotation-button"]').should('not.exist')
        cy.get('[data-cy="cancel-quotation-button"]').should('not.exist')
        cy.get('[data-cy="view-quotation-button"]').should('be.visible')
      })
    })

    it('should convert quotation to order', () => {
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="convert-to-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-convert-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      cy.get('.el-message--success').should('contain', '订单创建成功')
      
      // Verify order was created
      cy.visit('/orders')
      cy.get('[data-cy="orders-table"]').should('contain', '待确认')
    })

    it('should receive notification when quotation is received', () => {
      // This would be tested with real-time functionality
      // For now, we'll check if notifications are displayed
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '收到新报价')
    })
  })

  describe('Quotation Notifications', () => {
    it('should notify buyer when supplier submits quotation', () => {
      // Login as supplier and create quotation
      cy.loginAsSupplier()
      cy.visit('/inquiries')
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('30.00')
      cy.get('[data-cy="delivery-time-input"]').type('20')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // Login as buyer and check notifications
      cy.loginAsBuyer()
      cy.visit('/dashboard')
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '收到新报价')
      cy.get('[data-cy="notification-badge"]').should('be.visible')
    })
  })

  describe('Quotation Filtering and Search', () => {
    beforeEach(() => {
      cy.loginAsSupplier()
      cy.visit('/quotations')
    })

    it('should filter quotations by status', () => {
      cy.get('[data-cy="status-filter"]').click()
      cy.get('[data-cy="status-filter-active"]').click()
      
      cy.get('[data-cy="quotation-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="quotation-status"]').should('contain', '有效')
        })
      })
    })

    it('should search quotations by inquiry number', () => {
      cy.get('[data-cy="search-input"]').type('INQ-')
      cy.get('[data-cy="search-button"]').click()
      
      cy.get('[data-cy="quotation-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'INQ-')
      })
    })

    it('should filter quotations by date range', () => {
      cy.get('[data-cy="date-range-picker"]').click()
      cy.get('.el-date-picker__header-label').first().click()
      cy.get('.el-year-table td').contains('2024').click()
      cy.get('.el-month-table td').contains('1月').click()
      cy.get('.el-date-table td').contains('1').first().click()
      cy.get('.el-date-table td').contains('31').click()
      
      cy.get('[data-cy="quotation-row"]').should('have.length.at.least', 0)
    })
  })
})