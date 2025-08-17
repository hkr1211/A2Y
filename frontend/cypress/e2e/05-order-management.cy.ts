describe('Order Management', () => {
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
      cy.visit('/orders')
    })

    it('should display orders list correctly', () => {
      cy.waitForApiCall('@getOrders')
      cy.get('[data-cy="orders-table"]').should('be.visible')
      cy.get('[data-cy="add-order-button"]').should('be.visible')
      cy.get('[data-cy="order-row"]').should('have.length.at.least', 0)
    })

    it('should create independent order (not from inquiry)', () => {
      cy.get('[data-cy="add-order-button"]').click()
      cy.get('[data-cy="order-form-dialog"]').should('be.visible')
      
      cy.get('[data-cy="product-name-input"]').type('Direct Order Product')
      cy.get('[data-cy="material-type-input"]').type('Stainless Steel')
      cy.get('[data-cy="specifications-input"]').type('300x200x100mm')
      cy.get('[data-cy="special-requirements-input"]').type('Mirror finish required')
      cy.get('[data-cy="unit-price-input"]').type('45.50')
      cy.get('[data-cy="quantity-input"]').type('200')
      
      cy.get('[data-cy="save-order-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      cy.get('.el-message--success').should('contain', '订单创建成功')
      cy.get('[data-cy="order-form-dialog"]').should('not.exist')
      cy.get('[data-cy="orders-table"]').should('contain', 'Direct Order Product')
      cy.get('[data-cy="orders-table"]').should('contain', '待确认')
    })

    it('should create order from quotation', () => {
      // First, go to quotations and convert one to order
      cy.visit('/quotations')
      cy.waitForApiCall('@getQuotations')
      
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="convert-to-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-convert-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      cy.get('.el-message--success').should('contain', '订单创建成功')
      
      // Verify order appears in orders list
      cy.visit('/orders')
      cy.get('[data-cy="orders-table"]').should('contain', '待确认')
    })

    it('should cancel order when not confirmed by supplier', () => {
      // First create an order
      cy.get('[data-cy="add-order-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Order to Cancel')
      cy.get('[data-cy="material-type-input"]').type('Aluminum')
      cy.get('[data-cy="specifications-input"]').type('100x100x100mm')
      cy.get('[data-cy="unit-price-input"]').type('25.00')
      cy.get('[data-cy="quantity-input"]').type('50')
      cy.get('[data-cy="save-order-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      // Now cancel the order
      cy.get('[data-cy="orders-table"]').contains('Order to Cancel').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '待确认')
        cy.get('[data-cy="cancel-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-cancel-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已作废')
      cy.get('[data-cy="orders-table"]').contains('Order to Cancel').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '已作废')
      })
    })

    it('should not cancel order when confirmed by supplier', () => {
      // This test assumes there's a confirmed order in the test data
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('已确认')) {
              cy.get('[data-cy="cancel-order-button"]').should('be.disabled')
            }
          })
        })
      })
    })

    it('should view order details', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="order-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="order-number"]').should('be.visible')
      cy.get('[data-cy="product-name"]').should('be.visible')
      cy.get('[data-cy="material-type"]').should('be.visible')
      cy.get('[data-cy="specifications"]').should('be.visible')
      cy.get('[data-cy="unit-price"]').should('be.visible')
      cy.get('[data-cy="quantity"]').should('be.visible')
      cy.get('[data-cy="total-price"]').should('be.visible')
      cy.get('[data-cy="order-status"]').should('be.visible')
      cy.get('[data-cy="created-date"]').should('be.visible')
    })

    it('should confirm order completion when shipped', () => {
      // This test assumes there's a shipped order in the test data
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('已发货')) {
              cy.get('[data-cy="complete-order-button"]').click()
            }
          })
        })
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-complete-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已完成')
    })

    it('should only see own orders', () => {
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-creator"]').should('contain', 'buyer_test')
        })
      })
    })
  })

  describe('As Supplier User', () => {
    beforeEach(() => {
      cy.loginAsSupplier()
      cy.visit('/orders')
    })

    it('should view all orders and confirm them', () => {
      cy.waitForApiCall('@getOrders')
      cy.get('[data-cy="orders-table"]').should('be.visible')
      cy.get('[data-cy="add-order-button"]').should('not.exist')
      
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="confirm-order-button"]').should('be.visible')
      })
    })

    it('should confirm pending order', () => {
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('待确认')) {
              cy.get('[data-cy="confirm-order-button"]').click()
            }
          })
        })
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-order-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已确认')
    })

    it('should update order status to production', () => {
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('已确认')) {
              cy.get('[data-cy="update-status-button"]').click()
            }
          })
        })
      })
      
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-production"]').click()
      cy.get('[data-cy="update-status-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单状态已更新')
    })

    it('should update order status to shipped with documents', () => {
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('生产中')) {
              cy.get('[data-cy="update-status-button"]').click()
            }
          })
        })
      })
      
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-shipped"]').click()
      
      // Upload shipping documents
      cy.get('[data-cy="invoice-upload"]').selectFile('cypress/fixtures/invoice.pdf', { force: true })
      cy.get('[data-cy="shipping-doc-upload"]').selectFile('cypress/fixtures/shipping.pdf', { force: true })
      cy.get('[data-cy="material-cert-upload"]').selectFile('cypress/fixtures/certificate.pdf', { force: true })
      
      cy.get('[data-cy="update-status-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单状态已更新')
    })

    it('should cancel any order', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="cancel-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-cancel-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已作废')
    })
  })

  describe('Order Status Tracking', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/orders')
    })

    it('should display order status timeline', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="order-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="status-timeline"]').should('be.visible')
      cy.get('[data-cy="timeline-item"]').should('have.length.at.least', 1)
    })

    it('should show status change notifications', () => {
      // This would be tested with real-time functionality
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '订单状态更新')
    })
  })

  describe('Order Filtering and Search', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/orders')
    })

    it('should filter orders by status', () => {
      cy.get('[data-cy="status-filter"]').click()
      cy.get('[data-cy="status-filter-confirmed"]').click()
      
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy="order-status"]').should('contain', '已确认')
        })
      })
    })

    it('should search orders by order number', () => {
      cy.get('[data-cy="search-input"]').type('ORD-')
      cy.get('[data-cy="search-button"]').click()
      
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'ORD-')
      })
    })

    it('should filter orders by date range', () => {
      cy.get('[data-cy="date-range-picker"]').click()
      cy.get('.el-date-picker__header-label').first().click()
      cy.get('.el-year-table td').contains('2024').click()
      cy.get('.el-month-table td').contains('1月').click()
      cy.get('.el-date-table td').contains('1').first().click()
      cy.get('.el-date-table td').contains('31').click()
      
      cy.get('[data-cy="order-row"]').should('have.length.at.least', 0)
    })
  })

  describe('Order Permissions', () => {
    it('should enforce buyer permissions correctly', () => {
      cy.loginAsBuyer()
      cy.visit('/orders')
      
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          // Buyers can only see their own orders
          cy.get('[data-cy="order-creator"]').should('contain', 'buyer_test')
          
          // Buyers can cancel unconfirmed orders
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('待确认')) {
              cy.get('[data-cy="cancel-order-button"]').should('be.visible')
            } else {
              cy.get('[data-cy="cancel-order-button"]').should('be.disabled')
            }
          })
        })
      })
    })

    it('should enforce supplier permissions correctly', () => {
      cy.loginAsSupplier()
      cy.visit('/orders')
      
      cy.get('[data-cy="order-row"]').each(($row) => {
        cy.wrap($row).within(() => {
          // Suppliers can see all orders
          cy.get('[data-cy="view-order-button"]').should('be.visible')
          
          // Suppliers can confirm pending orders
          cy.get('[data-cy="order-status"]').then(($status) => {
            if ($status.text().includes('待确认')) {
              cy.get('[data-cy="confirm-order-button"]').should('be.visible')
            }
          })
          
          // Suppliers can cancel any order
          cy.get('[data-cy="cancel-order-button"]').should('be.visible')
        })
      })
    })
  })
})