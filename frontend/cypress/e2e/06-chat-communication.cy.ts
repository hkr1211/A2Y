describe('Chat Communication', () => {
  beforeEach(() => {
    cy.interceptApiCalls()
    cy.seedTestData()
  })

  afterEach(() => {
    cy.cleanTestData()
  })

  describe('Chat in Inquiry Context', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
    })

    it('should open chat window from inquiry details', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="inquiry-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="chat-button"]').click()
      
      cy.get('[data-cy="chat-window"]').should('be.visible')
      cy.get('[data-cy="chat-header"]').should('contain', '询单沟通')
      cy.get('[data-cy="message-input"]').should('be.visible')
      cy.get('[data-cy="send-button"]').should('be.visible')
    })

    it('should send message in inquiry chat', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Hello, I have a question about this inquiry.')
      cy.get('[data-cy="send-button"]').click()
      
      cy.waitForApiCall('@sendChatMessage')
      cy.get('[data-cy="message-item"]').should('contain', 'Hello, I have a question about this inquiry.')
      cy.get('[data-cy="message-sender"]').should('contain', 'buyer_test')
      cy.get('[data-cy="message-timestamp"]').should('be.visible')
    })

    it('should receive real-time messages', () => {
      // Open chat as buyer
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      cy.get('[data-cy="chat-button"]').click()
      
      // Simulate receiving a message from supplier (this would be done via Socket.IO in real scenario)
      cy.window().then((win) => {
        // Simulate socket message
        win.dispatchEvent(new CustomEvent('socket-message', {
          detail: {
            id: 'msg-123',
            content: 'Thank you for your inquiry. We will provide a quote soon.',
            senderId: 'supplier_test',
            timestamp: new Date().toISOString(),
            relatedId: 'inquiry-123',
            relatedType: 'inquiry'
          }
        }))
      })
      
      cy.get('[data-cy="message-item"]').should('contain', 'Thank you for your inquiry. We will provide a quote soon.')
      cy.get('[data-cy="message-sender"]').should('contain', 'supplier_test')
    })

    it('should show unread message indicator', () => {
      // This test would check for unread message badges
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="unread-messages-badge"]').should('be.visible')
        cy.get('[data-cy="unread-messages-count"]').should('contain', '1')
      })
    })

    it('should mark messages as read when chat is opened', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.waitForApiCall('@getChatMessages')
      
      // After opening chat, unread badge should disappear
      cy.get('[data-cy="chat-window"]').should('be.visible')
      cy.get('[data-cy="unread-messages-badge"]').should('not.exist')
    })
  })

  describe('Chat in Order Context', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/orders')
    })

    it('should open chat window from order details', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="order-detail-dialog"]').should('be.visible')
      cy.get('[data-cy="chat-button"]').click()
      
      cy.get('[data-cy="chat-window"]').should('be.visible')
      cy.get('[data-cy="chat-header"]').should('contain', '订单沟通')
    })

    it('should send message in order chat', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('When will this order be ready for shipment?')
      cy.get('[data-cy="send-button"]').click()
      
      cy.waitForApiCall('@sendChatMessage')
      cy.get('[data-cy="message-item"]').should('contain', 'When will this order be ready for shipment?')
    })

    it('should display chat history chronologically', () => {
      cy.get('[data-cy="order-row"]').first().within(() => {
        cy.get('[data-cy="view-order-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.waitForApiCall('@getChatMessages')
      
      // Check that messages are displayed in chronological order
      cy.get('[data-cy="message-item"]').then(($messages) => {
        const timestamps = []
        $messages.each((index, element) => {
          const timestamp = Cypress.$(element).find('[data-cy="message-timestamp"]').text()
          timestamps.push(new Date(timestamp))
        })
        
        // Verify timestamps are in ascending order
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).to.be.at.least(timestamps[i - 1])
        }
      })
    })
  })

  describe('Message Translation', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
    })

    it('should show translate button for each message', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('这是一条中文消息')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').should('be.visible')
      })
    })

    it('should translate message from Chinese to Japanese', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('这个产品的交货期是多长时间？')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').click()
      })
      
      cy.waitForApiCall('@translateMessage')
      cy.get('[data-cy="translated-content"]').should('be.visible')
      cy.get('[data-cy="translated-content"]').should('contain', 'この製品の納期はどのくらいですか？')
      cy.get('[data-cy="original-content"]').should('contain', '这个产品的交货期是多长时间？')
    })

    it('should translate message from Japanese to Chinese', () => {
      // Switch to Japanese interface first
      cy.switchLanguage('ja')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('この製品の仕様について詳しく教えてください。')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').click()
      })
      
      cy.waitForApiCall('@translateMessage')
      cy.get('[data-cy="translated-content"]').should('be.visible')
      cy.get('[data-cy="translated-content"]').should('contain', '请详细介绍这个产品的规格。')
    })

    it('should toggle between original and translated content', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('价格可以优惠吗？')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').click()
      })
      
      cy.waitForApiCall('@translateMessage')
      cy.get('[data-cy="translated-content"]').should('be.visible')
      
      // Click translate button again to toggle back to original
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').click()
      })
      
      cy.get('[data-cy="translated-content"]').should('not.be.visible')
      cy.get('[data-cy="original-content"]').should('be.visible')
    })

    it('should handle translation errors gracefully', () => {
      // Mock translation API error
      cy.intercept('POST', '/api/chat/translate', { statusCode: 500 }).as('translateError')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('测试翻译错误')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="translate-button"]').click()
      })
      
      cy.wait('@translateError')
      cy.get('.el-message--error').should('contain', '翻译失败')
    })
  })

  describe('Chat Permissions', () => {
    it('should allow buyer to chat in own inquiries and orders', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').should('be.visible')
    })

    it('should allow supplier to chat in all inquiries and orders', () => {
      cy.loginAsSupplier()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').should('be.visible')
    })

    it('should show sender information correctly', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Test message from buyer')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-item"]').first().within(() => {
        cy.get('[data-cy="message-sender"]').should('contain', 'buyer_test')
        cy.get('[data-cy="sender-role"]').should('contain', '买方')
      })
    })
  })

  describe('Chat Notifications', () => {
    it('should show notification when new message is received', () => {
      cy.loginAsBuyer()
      cy.visit('/dashboard')
      
      // Simulate receiving a chat message notification
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('socket-notification', {
          detail: {
            type: 'message_received',
            title: '收到新消息',
            content: '供应商在询单中发送了新消息',
            relatedId: 'inquiry-123'
          }
        }))
      })
      
      cy.get('[data-cy="notification-dropdown"]').click()
      cy.get('[data-cy="notification-item"]').should('contain', '收到新消息')
    })

    it('should update unread message count in real-time', () => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
      
      // Simulate receiving a new message
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('socket-message', {
          detail: {
            id: 'msg-new',
            content: 'New message from supplier',
            senderId: 'supplier_test',
            timestamp: new Date().toISOString(),
            relatedId: 'inquiry-123',
            relatedType: 'inquiry',
            isRead: false
          }
        }))
      })
      
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="unread-messages-badge"]').should('be.visible')
        cy.get('[data-cy="unread-messages-count"]').should('contain', '1')
      })
    })
  })

  describe('Chat UI and UX', () => {
    beforeEach(() => {
      cy.loginAsBuyer()
      cy.visit('/inquiries')
    })

    it('should auto-scroll to latest message', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      
      // Send multiple messages to test auto-scroll
      for (let i = 1; i <= 5; i++) {
        cy.get('[data-cy="message-input"]').type(`Message ${i}`)
        cy.get('[data-cy="send-button"]').click()
        cy.wait(500) // Small delay between messages
      }
      
      // The latest message should be visible
      cy.get('[data-cy="message-item"]').last().should('contain', 'Message 5')
      cy.get('[data-cy="message-item"]').last().should('be.visible')
    })

    it('should clear input after sending message', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Test message')
      cy.get('[data-cy="send-button"]').click()
      
      cy.get('[data-cy="message-input"]').should('have.value', '')
    })

    it('should send message with Enter key', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="message-input"]').type('Message sent with Enter{enter}')
      
      cy.waitForApiCall('@sendChatMessage')
      cy.get('[data-cy="message-item"]').should('contain', 'Message sent with Enter')
    })

    it('should disable send button when input is empty', () => {
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      cy.get('[data-cy="send-button"]').should('be.disabled')
      
      cy.get('[data-cy="message-input"]').type('Some text')
      cy.get('[data-cy="send-button"]').should('not.be.disabled')
      
      cy.get('[data-cy="message-input"]').clear()
      cy.get('[data-cy="send-button"]').should('be.disabled')
    })

    it('should show typing indicator when appropriate', () => {
      // This would test real-time typing indicators
      cy.get('[data-cy="inquiry-row"]').first().within(() => {
        cy.get('[data-cy="view-inquiry-button"]').click()
      })
      
      cy.get('[data-cy="chat-button"]').click()
      
      // Simulate typing indicator from other user
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('socket-typing', {
          detail: {
            userId: 'supplier_test',
            isTyping: true,
            relatedId: 'inquiry-123'
          }
        }))
      })
      
      cy.get('[data-cy="typing-indicator"]').should('be.visible')
      cy.get('[data-cy="typing-indicator"]').should('contain', 'supplier_test 正在输入...')
    })
  })
})