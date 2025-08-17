# End-to-End Testing with Cypress

This directory contains comprehensive end-to-end tests for the Trade Inquiry Order System using Cypress.

## Test Structure

### Test Suites

1. **01-authentication.cy.ts** - Authentication Flow
   - Login/logout functionality
   - Role-based access control
   - Session management
   - Route protection

2. **02-user-management.cy.ts** - User Management
   - Admin user CRUD operations
   - Role assignment
   - User filtering and search
   - Permission validation

3. **03-inquiry-management.cy.ts** - Inquiry Management
   - Inquiry creation and modification
   - File attachment handling
   - Status management
   - Permission controls

4. **04-quotation-management.cy.ts** - Quotation Management
   - Quotation creation and updates
   - Notification system
   - Price calculations
   - Conversion to orders

5. **05-order-management.cy.ts** - Order Management
   - Order lifecycle management
   - Status tracking
   - Document uploads
   - Permission enforcement

6. **06-chat-communication.cy.ts** - Chat Communication
   - Real-time messaging
   - Message translation
   - Notification system
   - Chat history

7. **07-multilingual-support.cy.ts** - Multilingual Support
   - Language switching
   - Interface translation
   - User preferences
   - Content localization

8. **08-complete-business-flow.cy.ts** - Complete Business Flow
   - End-to-end workflows
   - Multi-user scenarios
   - Error handling
   - Performance testing

## Setup and Configuration

### Prerequisites

1. Node.js and npm installed
2. Frontend application running on `http://localhost:5173`
3. Backend API running on `http://localhost:3000`
4. Test database with seed data

### Installation

```bash
# Install Cypress and dependencies
npm install --save-dev cypress @cypress/vue

# Open Cypress Test Runner
npm run cypress:open

# Run tests headlessly
npm run cypress:run
```

### Configuration Files

- `cypress.config.ts` - Main Cypress configuration
- `cypress/support/e2e.ts` - E2E test setup and custom commands
- `cypress/support/commands.ts` - Custom Cypress commands
- `cypress/support/component.ts` - Component testing setup

## Custom Commands

### Authentication Commands
- `cy.login(username, password)` - Login with credentials
- `cy.loginAsAdmin()` - Login as admin user
- `cy.loginAsBuyer()` - Login as buyer user
- `cy.loginAsSupplier()` - Login as supplier user

### Language Commands
- `cy.switchLanguage(language)` - Switch interface language

### Data Management Commands
- `cy.seedTestData()` - Create test data
- `cy.cleanTestData()` - Clean up test data
- `cy.interceptApiCalls()` - Set up API call interceptions

### Utility Commands
- `cy.waitForApiCall(alias)` - Wait for specific API call

## Test Data Management

### Fixtures
Test data files are stored in `cypress/fixtures/`:
- `test-image.jpg` - Sample image for file uploads
- `technical-drawing.pdf` - Sample PDF for technical documents
- `invoice.pdf` - Sample invoice document
- `shipping-document.pdf` - Sample shipping document
- `material-certificate.pdf` - Sample material certificate
- `large-inquiries-dataset.json` - Large dataset for performance testing

### Test Data Lifecycle
1. **Setup**: `cy.seedTestData()` creates necessary test users and data
2. **Execution**: Tests run with isolated data
3. **Cleanup**: `cy.cleanTestData()` removes test data after each test

## Running Tests

### Interactive Mode
```bash
# Open Cypress Test Runner GUI
npm run e2e:open

# Open specific test type
npm run cypress:open --e2e
```

### Headless Mode
```bash
# Run all E2E tests
npm run e2e

# Run specific test file
npm run cypress:run --spec "cypress/e2e/01-authentication.cy.ts"

# Run with specific browser
npm run cypress:run --browser chrome
```

### Comprehensive Test Suite
```bash
# Run all tests with detailed reporting
node cypress/scripts/run-all-tests.js
```

## Test Coverage

### Business Requirements Covered

#### User Management (Requirements 1, 9)
- ✅ Default admin account creation
- ✅ User role management
- ✅ Permission controls
- ✅ Dashboard access by role

#### Inquiry Management (Requirement 2)
- ✅ Inquiry creation with attachments
- ✅ Inquiry modification before reply
- ✅ Status management
- ✅ Permission enforcement

#### Quotation Management (Requirement 3)
- ✅ Supplier quotation replies
- ✅ Price calculations
- ✅ Notification system
- ✅ Quotation modifications

#### Order Management (Requirements 4, 5)
- ✅ Order creation (from inquiry and independent)
- ✅ Status tracking workflow
- ✅ Document management
- ✅ Completion confirmation

#### Communication (Requirement 6)
- ✅ Real-time chat functionality
- ✅ Message translation (Chinese ↔ Japanese)
- ✅ Chat history and notifications
- ✅ Context-based communication

#### Multilingual Support (Requirement 7)
- ✅ Language switching
- ✅ User preference persistence
- ✅ Interface translation
- ✅ Content localization

#### File Management (Requirement 8)
- ✅ File upload and validation
- ✅ Multiple format support
- ✅ File preview and download
- ✅ Attachment management

### Permission Testing
- ✅ Buyer permissions (own inquiries/orders only)
- ✅ Supplier permissions (all inquiries/orders)
- ✅ Admin permissions (full access)
- ✅ Status-based restrictions

### Error Scenarios
- ✅ Network error handling
- ✅ Session expiration
- ✅ Data conflicts
- ✅ Validation errors

### Performance Testing
- ✅ Large dataset handling
- ✅ Rapid user interactions
- ✅ Real-time updates
- ✅ Search and filtering

## Best Practices

### Test Organization
1. **Descriptive test names** - Clear description of what is being tested
2. **Proper setup/teardown** - Clean state for each test
3. **Data isolation** - Tests don't interfere with each other
4. **Realistic scenarios** - Tests mirror actual user workflows

### Assertions
1. **Specific selectors** - Use `data-cy` attributes for reliable element selection
2. **Wait for API calls** - Ensure API calls complete before assertions
3. **Visual feedback** - Test user-visible changes and messages
4. **State verification** - Confirm system state changes

### Maintenance
1. **Regular updates** - Keep tests updated with UI changes
2. **Flaky test monitoring** - Identify and fix unreliable tests
3. **Performance monitoring** - Track test execution times
4. **Documentation** - Keep test documentation current

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timing
```javascript
// Use proper waits instead of arbitrary delays
cy.waitForApiCall('@createInquiry')
// Instead of: cy.wait(2000)
```

#### Element Not Found
```javascript
// Ensure elements exist before interaction
cy.get('[data-cy="button"]').should('be.visible').click()
```

#### API Call Issues
```javascript
// Set up proper API interceptions
cy.interceptApiCalls()
cy.waitForApiCall('@specificCall')
```

### Debug Mode
```bash
# Run with debug output
DEBUG=cypress:* npm run cypress:run

# Open DevTools in interactive mode
npm run cypress:open
```

### Screenshots and Videos
- Screenshots are automatically taken on test failures
- Videos can be enabled in `cypress.config.ts`
- Artifacts are stored in `cypress/screenshots` and `cypress/videos`

## Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Start application
        run: npm run dev &
      - name: Run E2E tests
        run: npm run e2e
```

## Reporting

### Test Results
- Console output with pass/fail counts
- Detailed error messages for failures
- Screenshots for failed tests
- Execution time metrics

### Coverage Reports
- Business requirement coverage
- User workflow coverage
- Error scenario coverage
- Performance benchmark results

## Contributing

### Adding New Tests
1. Follow the existing naming convention
2. Add proper setup/teardown
3. Use descriptive test names
4. Include relevant assertions
5. Update this documentation

### Test Data
1. Use realistic test data
2. Clean up after tests
3. Avoid hardcoded values
4. Use fixtures for complex data

### Custom Commands
1. Add to `cypress/support/commands.ts`
2. Include TypeScript definitions
3. Document usage examples
4. Test the commands themselves