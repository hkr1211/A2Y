// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your component test files.
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

// Import global styles
import 'element-plus/dist/index.css'

import { mount } from 'cypress/vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', (component, options = {}) => {
  // Setup Pinia store
  const pinia = createPinia()
  
  // Setup i18n
  const i18n = createI18n({
    legacy: false,
    locale: 'zh',
    fallbackLocale: 'zh',
    messages: {
      zh: {
        test: '测试'
      },
      ja: {
        test: 'テスト'
      }
    }
  })

  // Setup global properties
  options.global = options.global || {}
  options.global.plugins = options.global.plugins || []
  options.global.plugins.push(pinia, i18n, ElementPlus)
  
  // Register Element Plus icons
  options.global.components = options.global.components || {}
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    options.global.components[key] = component
  }

  return mount(component, options)
})

// Example use:
// cy.mount(MyComponent)