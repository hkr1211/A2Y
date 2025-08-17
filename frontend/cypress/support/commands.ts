/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to seed test data
Cypress.Commands.add('seedTestData', () => {
  // Create test users
  cy.request('POST', '/api/test/seed-users', {
    users: [
      {
        username: 'buyer_test',
        password: 'password123',
        role: 'buyer',
        company: 'arroz'
      },
      {
        username: 'supplier_test',
        password: 'password123',
        role: 'supplier',
        company: 'yunjie'
      }
    ]
  })

  // Create test inquiries
  cy.request('POST', '/api/test/seed-inquiries', {
    inquiries: [
      {
        productName: 'Test Product 1',
        materialType: 'Steel',
        specifications: '100x50x20mm',
        quantity: 100,
        createdBy: 'buyer_test'
      }
    ]
  })
})

// Custom command to clean test data
Cypress.Commands.add('cleanTestData', () => {
  cy.request('DELETE', '/api/test/clean-data')
})

// Custom command to intercept common API calls
Cypress.Commands.add('interceptApiCalls', () => {
  cy.intercept('GET', '/api/inquiries*').as('getInquiries')
  cy.intercept('POST', '/api/inquiries').as('createInquiry')
  cy.intercept('PUT', '/api/inquiries/*').as('updateInquiry')
  cy.intercept('DELETE', '/api/inquiries/*').as('deleteInquiry')
  
  cy.intercept('GET', '/api/quotations*').as('getQuotations')
  cy.intercept('POST', '/api/quotations').as('createQuotation')
  cy.intercept('PUT', '/api/quotations/*').as('updateQuotation')
  
  cy.intercept('GET', '/api/orders*').as('getOrders')
  cy.intercept('POST', '/api/orders').as('createOrder')
  cy.intercept('PUT', '/api/orders/*').as('updateOrder')
  
  cy.intercept('GET', '/api/users*').as('getUsers')
  cy.intercept('POST', '/api/users').as('createUser')
  cy.intercept('PUT', '/api/users/*').as('updateUser')
  cy.intercept('DELETE', '/api/users/*').as('deleteUser')
  
  cy.intercept('GET', '/api/notifications*').as('getNotifications')
  cy.intercept('PUT', '/api/notifications/*/read').as('markNotificationRead')
  
  cy.intercept('GET', '/api/chat/messages/*').as('getChatMessages')
  cy.intercept('POST', '/api/chat/messages').as('sendChatMessage')
  cy.intercept('POST', '/api/chat/translate').as('translateMessage')
})

declare global {
  namespace Cypress {
    interface Chainable {
      seedTestData(): Chainable<void>
      cleanTestData(): Chainable<void>
      interceptApiCalls(): Chainable<void>
    }
  }
}