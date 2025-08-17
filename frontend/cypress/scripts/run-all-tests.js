const cypress = require('cypress')

async function runAllTests() {
  console.log('🚀 Starting comprehensive E2E test suite...')
  
  const testSuites = [
    {
      name: 'Authentication Flow',
      spec: 'cypress/e2e/01-authentication.cy.ts',
      description: 'Tests user login, logout, and authentication flows'
    },
    {
      name: 'User Management',
      spec: 'cypress/e2e/02-user-management.cy.ts',
      description: 'Tests admin user management capabilities'
    },
    {
      name: 'Inquiry Management',
      spec: 'cypress/e2e/03-inquiry-management.cy.ts',
      description: 'Tests inquiry creation, modification, and permissions'
    },
    {
      name: 'Quotation Management',
      spec: 'cypress/e2e/04-quotation-management.cy.ts',
      description: 'Tests quotation creation, updates, and notifications'
    },
    {
      name: 'Order Management',
      spec: 'cypress/e2e/05-order-management.cy.ts',
      description: 'Tests order lifecycle and status tracking'
    },
    {
      name: 'Chat Communication',
      spec: 'cypress/e2e/06-chat-communication.cy.ts',
      description: 'Tests real-time chat and translation features'
    },
    {
      name: 'Multilingual Support',
      spec: 'cypress/e2e/07-multilingual-support.cy.ts',
      description: 'Tests language switching and internationalization'
    },
    {
      name: 'Complete Business Flow',
      spec: 'cypress/e2e/08-complete-business-flow.cy.ts',
      description: 'Tests end-to-end business processes'
    }
  ]

  let totalPassed = 0
  let totalFailed = 0
  const results = []

  for (const suite of testSuites) {
    console.log(`\n📋 Running: ${suite.name}`)
    console.log(`   ${suite.description}`)
    
    try {
      const result = await cypress.run({
        spec: suite.spec,
        browser: 'chrome',
        headless: true,
        video: false,
        screenshot: true
      })

      const passed = result.totalPassed || 0
      const failed = result.totalFailed || 0
      
      totalPassed += passed
      totalFailed += failed
      
      results.push({
        suite: suite.name,
        passed,
        failed,
        status: failed === 0 ? '✅ PASSED' : '❌ FAILED'
      })
      
      console.log(`   Result: ${passed} passed, ${failed} failed`)
      
    } catch (error) {
      console.error(`   Error running ${suite.name}:`, error.message)
      results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        status: '❌ ERROR'
      })
      totalFailed += 1
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST EXECUTION SUMMARY')
  console.log('='.repeat(60))
  
  results.forEach(result => {
    console.log(`${result.status} ${result.suite}: ${result.passed} passed, ${result.failed} failed`)
  })
  
  console.log('\n' + '-'.repeat(60))
  console.log(`🎯 TOTAL: ${totalPassed} passed, ${totalFailed} failed`)
  console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
  
  if (totalFailed === 0) {
    console.log('🎉 All tests passed! System is ready for production.')
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.')
  }
  
  process.exit(totalFailed === 0 ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Failed to run tests:', error)
    process.exit(1)
  })
}

module.exports = { runAllTests }