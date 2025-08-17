// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Custom commands for authentication
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login')
  cy.get('[data-cy="username-input"]').type(username)
  cy.get('[data-cy="password-input"]').type(password)
  cy.get('[data-cy="login-button"]').click()
  cy.url().should('not.include', '/login')
})

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin', 'admin123')
})

Cypress.Commands.add('loginAsBuyer', () => {
  cy.login('buyer_test', 'password123')
})

Cypress.Commands.add('loginAsSupplier', () => {
  cy.login('supplier_test', 'password123')
})

// Custom commands for language switching
Cypress.Commands.add('switchLanguage', (language: 'zh' | 'ja') => {
  cy.get('[data-cy="language-switcher"]').click()
  cy.get(`[data-cy="language-option-${language}"]`).click()
})

// Custom commands for waiting for API calls
Cypress.Commands.add('waitForApiCall', (alias: string) => {
  cy.wait(alias).its('response.statusCode').should('eq', 200)
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>
      loginAsAdmin(): Chainable<void>
      loginAsBuyer(): Chainable<void>
      loginAsSupplier(): Chainable<void>
      switchLanguage(language: 'zh' | 'ja'): Chainable<void>
      waitForApiCall(alias: string): Chainable<void>
    }
  }
}