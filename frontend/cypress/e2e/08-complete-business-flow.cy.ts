describe('Complete Business Flow', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.cleanTestData()
    cy.seedTestData()
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  describe('End-to-End Business Process', () => {
    it('should complete full inquiry-to-order workflow', () => {
      // Step 1: Buyer creates inquiry
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Custom Steel Component')
      cy.get('[data-cy="material-type-input"]').type('Stainless Steel 316L')
      cy.get('[data-cy="specifications-input"]').type('Length: 500mm, Width: 200mm, Height: 100mm, Tolerance: ±0.1mm')
      cy.get('[data-cy="special-requirements-input"]').type('Mirror finish required, food grade quality')
      cy.get('[data-cy="quantity-input"]').type('250')
      
      // Upload technical drawing
      cy.get('[data-cy="file-upload"]').selectFile('cypress/fixtures/technical-drawing.pdf', { force: true })
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      cy.get('.el-message--success').should('contain', '询单创建成功')
      
      // Get the inquiry number for later reference
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="inquiry-number"]').invoke('text').as('inquiryNumber')
      })
      
      // Step 2: Buyer and Supplier communicate about inquiry
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Hello, I need this component for food processing equipment. Can you provide a quote?')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      // Close chat and inquiry detail
      cy.get('[data-cy="close-chat-button"]').click()
      cy.get('[data-cy="close-dialog-button"]').click()
      
      // Step 3: Supplier views inquiry and provides quotation
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/inquiries')
      
      // Find the inquiry created by buyer
      cy.get('@inquiryNumber').then((inquiryNumber) => {
        cy.get('[data-cy="inquiries-table"]').contains(inquiryNumber).parents('[data-cy="inquiry-row"]').within(() => {
          cy.get('[data-cy="reply-inquiry-button"]').click()
        })
      })
      
      // Supplier responds in chat first
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Thank you for your inquiry. We can manufacture this component with food grade certification. Let me provide a detailed quote.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      
      // Provide quotation
      cy.get('[data-cy="unit-price-input"]').type('85.50')
      cy.get('[data-cy="delivery-time-input"]').type('35')
      cy.get('[data-cy="remarks-input"]').type('Price includes food grade certification. Material: 316L stainless steel with mirror finish. Lead time: 35 days from order confirmation.')
      
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      cy.get('.el-message--success').should('contain', '报价提交成功')
      
      // Step 4: Buyer reviews quotation and negotiates
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      
      // Check notification for new quotation
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '收到新报价')
      cy.get('[data-cy="notification-item"]').first().click()
      
      // This should navigate to quotations page
      cy.url().should('include', '/quotations')
      
      // Review the quotation
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="view-quotation-button"]').click()
      })
      
      cy.get('[data-cy="quotation-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="unit-price"]').should('contain', '85.50')
      cy.get('[data-cy="total-price"]').should('contain', '21,375.00')
      cy.get('[data-cy="delivery-time"]').should('contain', '35')
      
      // Negotiate via chat
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('The quote looks good, but can you reduce the lead time to 30 days? We have a tight project schedule.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      cy.get('[data-cy="close-dialog-button"]').click()
      
      // Step 5: Supplier adjusts quotation
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/quotations')
      
      // Check chat message and respond
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="view-quotation-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('We can accommodate 30 days delivery, but there will be a 5% rush charge. Updated price would be $89.78 per unit.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      
      // Update quotation
      cy.get('[data-cy="edit-quotation-button"]').click()
      cy.get('[data-cy="unit-price-input"]').clear().type('89.78')
      cy.get('[data-cy="delivery-time-input"]').clear().type('30')
      cy.get('[data-cy="remarks-input"]').clear().type('Updated price includes 5% rush charge for 30-day delivery. Material: 316L stainless steel with mirror finish and food grade certification.')
      
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@updateQuotation')
      
      cy.get('.el-message--success').should('contain', '报价更新成功')
      cy.get('[data-cy="close-dialog-button"]').click()
      
      // Step 6: Buyer accepts quotation and creates order
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      cy.visit('/quotations')
      
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="view-quotation-button"]').click()
      })
      
      // Accept the updated quotation via chat
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Perfect! The updated quote is acceptable. Please proceed with the order.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      
      // Convert quotation to order
      cy.get('[data-cy="convert-to-order-button"]').click()
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-convert-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      cy.get('.el-message--success').should('contain', '订单创建成功')
      
      // Step 7: Supplier confirms order
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/orders')
      
      // Find the new order
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '待确认')
        cy.get('[data-cy="confirm-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-order-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已确认')
      
      // Send confirmation message
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Order confirmed! We will begin production immediately. Expected completion: 30 days from today.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      cy.get('[data-cy="close-dialog-button"]').click()
      
      // Step 8: Supplier updates order status to production
      cy.wait(2000) // Wait a moment to simulate time passing
      
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="update-status-button"]').click()
      })
      
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-production"]').click()
      cy.get('[data-cy="update-status-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单状态已更新')
      
      // Step 9: Supplier updates order status to shipped
      cy.wait(2000) // Simulate production time
      
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="update-status-button"]').click()
      })
      
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-shipped"]').click()
      
      // Upload shipping documents
      cy.get('[data-cy="invoice-upload"]').selectFile('cypress/fixtures/invoice.pdf', { force: true })
      cy.get('[data-cy="shipping-doc-upload"]').selectFile('cypress/fixtures/shipping-document.pdf', { force: true })
      cy.get('[data-cy="material-cert-upload"]').selectFile('cypress/fixtures/material-certificate.pdf', { force: true })
      
      cy.get('[data-cy="update-status-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单状态已更新')
      
      // Send shipping notification
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Good news! Your order has been shipped. Tracking number: TRK123456789. Expected delivery: 3-5 business days.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      cy.get('[data-cy="close-chat-button"]').click()
      cy.get('[data-cy="close-dialog-button"]').click()
      
      // Step 10: Buyer confirms order completion
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      cy.visit('/orders')
      
      // Check notification for shipment
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '订单状态更新')
      
      // Confirm receipt
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '已发货')
        cy.get('[data-cy="complete-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-complete-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已完成')
      
      // Send final message
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Order received and inspected. Quality is excellent! Thank you for the great service.')
      cy.get('[data-cy="send-button"]').click()
      cy.waitForApiCall('@sendChatMessage')
      
      // Verify final order status
      cy.get('[data-cy="close-chat-button"]').click()
      cy.get('[data-cy="order-status"]').should('contain', '已完成')
      
      // Verify order timeline shows all status changes
      cy.get('[data-cy="status-timeline"]').should('be.visible')
      cy.get('[data-cy="timeline-item"]').should('have.length', 5) // Created, Confirmed, Production, Shipped, Completed
    })

    it('should handle order cancellation workflow', () => {
      // Step 1: Buyer creates order
      cy.loginAsBuyer()
      cy.visit('/orders')
      
      cy.get('[data-cy="add-order-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Order to Cancel')
      cy.get('[data-cy="material-type-input"]').type('Aluminum')
      cy.get('[data-cy="specifications-input"]').type('Standard specifications')
      cy.get('[data-cy="unit-price-input"]').type('50.00')
      cy.get('[data-cy="quantity-input"]').type('100')
      
      cy.get('[data-cy="save-order-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      // Step 2: Buyer cancels order before supplier confirmation
      cy.get('[data-cy="orders-table"]').contains('Order to Cancel').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '待确认')
        cy.get('[data-cy="cancel-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-dialog"]').should('be.visible')
      cy.get('[data-cy="confirm-cancel-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      cy.get('.el-message--success').should('contain', '订单已作废')
      
      // Step 3: Verify supplier sees cancelled order
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/orders')
      
      cy.get('[data-cy="orders-table"]').contains('Order to Cancel').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '已作废')
        cy.get('[data-cy="confirm-order-button"]').should('not.exist')
      })
    })

    it('should handle inquiry modification and re-quotation workflow', () => {
      // Step 1: Buyer creates inquiry
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Modifiable Product')
      cy.get('[data-cy="material-type-input"]').type('Steel')
      cy.get('[data-cy="specifications-input"]').type('Original specifications')
      cy.get('[data-cy="quantity-input"]').type('100')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      // Step 2: Buyer modifies inquiry before quotation
      cy.get('[data-cy="inquiries-table"]').contains('Modifiable Product').parents('[data-cy="inquiry-row"]').within(() => {
        cy.get('[data-cy="edit-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="inquiry-form-dialog"]').should('be.visible')
      cy.get('[data-cy="specifications-input"]').clear().type('Updated specifications with higher precision')
      cy.get('[data-cy="quantity-input"]').clear().type('150')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@updateInquiry')
      
      cy.get('.el-message--success').should('contain', '询单更新成功')
      
      // Step 3: Supplier provides quotation
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiries-table"]').contains('Modifiable Product').parents('[data-cy="inquiry-row"]').within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('75.00')
      cy.get('[data-cy="delivery-time-input"]').type('25')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // Step 4: Verify buyer cannot modify inquiry after quotation
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiries-table"]').contains('Modifiable Product').parents('[data-cy="inquiry-row"]').within(() => {
        cy.get('[data-cy="inquiry-status"]').should('contain', '已回复')
        cy.get('[data-cy="edit-inquiry-button"]').should('be.disabled')
        cy.get('[data-cy="cancel-inquiry-button"]').should('be.disabled')
      })
    })
  })

  describe('Multi-User Concurrent Operations', () => {
    it('should handle concurrent user operations correctly', () => {
      // This test simulates multiple users working simultaneously
      // In a real scenario, this would involve multiple browser instances
      
      // Create inquiry as buyer
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Concurrent Test Product')
      cy.get('[data-cy="material-type-input"]').type('Titanium')
      cy.get('[data-cy="specifications-input"]').type('High-precision component')
      cy.get('[data-cy="quantity-input"]').type('75')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      // Switch to supplier and provide quotation
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiries-table"]').contains('Concurrent Test Product').parents('[data-cy="inquiry-row"]').within(() => {
        cy.get('[data-cy="reply-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="unit-price-input"]').type('120.00')
      cy.get('[data-cy="delivery-time-input"]').type('40')
      cy.get('[data-cy="save-quotation-button"]').click()
      cy.waitForApiCall('@createQuotation')
      
      // Switch back to buyer and convert to order
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      cy.visit('/quotations')
      
      cy.get('[data-cy="quotation-row"]').first().within(() => {
        cy.get('[data-cy="convert-to-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-convert-button"]').click()
      cy.waitForApiCall('@createOrder')
      
      // Verify both users can see the order with correct status
      cy.visit('/orders')
      cy.get('[data-cy="orders-table"]').contains('Concurrent Test Product').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '待确认')
      })
      
      // Switch to supplier and confirm
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsSupplier()
      cy.visit('/orders')
      
      cy.get('[data-cy="orders-table"]').contains('Concurrent Test Product').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="confirm-order-button"]').click()
      })
      
      cy.get('[data-cy="confirm-order-confirm-button"]').click()
      cy.waitForApiCall('@updateOrder')
      
      // Verify buyer sees updated status
      cy.get('[data-cy="user-menu"]').click()
      cy.get('[data-cy="logout-button"]').click()
      
      cy.loginAsBuyer()
      cy.visit('/orders')
      
      cy.get('[data-cy="orders-table"]').contains('Concurrent Test Product').parents('[data-cy="order-row"]').within(() => {
        cy.get('[data-cy="order-status"]').should('contain', '已确认')
      })
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully during business flow', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      // Simulate network error during inquiry creation
      cy.intercept('POST', '/api/inquiries', { statusCode: 500 }).as('createInquiryError')
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Error Test Product')
      cy.get('[data-cy="material-type-input"]').type('Steel')
      cy.get('[data-cy="specifications-input"]').type('Test specifications')
      cy.get('[data-cy="quantity-input"]').type('50')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.wait('@createInquiryError')
      
      // Should show error message and keep form open
      cy.get('.el-message--error').should('contain', '创建失败')
      cy.get('[data-cy="inquiry-form-dialog"]').should('be.visible')
      
      // Restore normal API and retry
      cy.intercept('POST', '/api/inquiries').as('createInquiry')
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      cy.get('.el-message--success').should('contain', '询单创建成功')
    })

    it('should handle session expiration during business flow', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      // Simulate session expiration
      cy.intercept('GET', '/api/inquiries*', { statusCode: 401 }).as('sessionExpired')
      
      cy.reload()
      cy.wait('@sessionExpired')
      
      // Should redirect to login
      cy.url().should('include', '/login')
      cy.get('.el-message--warning').should('contain', '会话已过期')
      
      // Login again and continue
      cy.loginAsBuyer()
      cy.url().should('include', '/dashboard')
    })

    it('should handle data conflicts during concurrent modifications', () => {
      // This test would simulate optimistic locking scenarios
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Conflict Test Product')
      cy.get('[data-cy="material-type-input"]').type('Aluminum')
      cy.get('[data-cy="specifications-input"]').type('Original specs')
      cy.get('[data-cy="quantity-input"]').type('100')
      
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.waitForApiCall('@createInquiry')
      
      // Simulate conflict during update
      cy.get('[data-cy="inquiries-table"]').contains('Conflict Test Product').parents('[data-cy="inquiry-row"]').within(() => {
        cy.get('[data-cy="edit-inquiry-button"]').click()
      })
      
      cy.intercept('PUT', '/api/inquiries/*', { statusCode: 409, body: { error: 'Conflict: Record has been modified by another user' } }).as('updateConflict')
      
      cy.get('[data-cy="specifications-input"]').clear().type('Modified specs')
      cy.get('[data-cy="save-inquiry-button"]').click()
      cy.wait('@updateConflict')
      
      // Should show conflict error and suggest refresh
      cy.get('.el-message--error').should('contain', '数据冲突')
      cy.get('[data-cy="refresh-data-button"]').should('be.visible')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle large datasets efficiently', () => {
      // This test would verify performance with many records
      cy.loginAsAdmin()
      cy.visit('/inquiries')
      
      // Simulate loading many inquiries
      cy.intercept('GET', '/api/inquiries*', { fixture: 'large-inquiries-dataset.json' }).as('loadLargeDataset')
      
      cy.reload()
      cy.wait('@loadLargeDataset')
      
      // Should load within reasonable time and display pagination
      cy.get('[data-cy="inquiries-table"]').should('be.visible')
      cy.get('[data-cy="pagination"]').should('be.visible')
      cy.get('[data-cy="total-records"]').should('contain', '1000+')
      
      // Test search performance
      cy.get('[data-cy="search-input"]').type('Test Product')
      cy.get('[data-cy="search-button"]').click()
      
      // Should filter results quickly
      cy.get('[data-cy="inquiry-row"]').should('have.length.lessThan', 50)
    })

    it('should handle rapid user interactions gracefully', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      // Rapidly click through different pages and actions
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="cancel-button"]').click()
      
      cy.get('[data-cy="add-inquiry-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Rapid Test')
      cy.get('[data-cy="cancel-button"]').click()
      
      // Should handle rapid interactions without errors
      cy.get('[data-cy="inquiries-table"]').should('be.visible')
      cy.get('.el-message--error').should('not.exist')
    })
  })
})