# Frontend Test Suite

This document describes the comprehensive test suite for the frontend implementation of the Trade Inquiry Order System.

## Test Coverage Overview

### Authentication Interface Tests

#### 1. Auth Store Tests (`src/tests/stores/auth.test.ts`)

Tests the Pinia authentication store functionality:

- **Initial State**: Verifies correct initialization and token loading from localStorage
- **Login**: Tests successful login, error handling, and loading states
- **Logout**: Tests logout functionality with API calls and error scenarios
- **Check Auth**: Tests token verification and user data restoration
- **Update User Language**: Tests language preference updates
- **Initialize Interceptors**: Tests axios interceptor setup
- **Computed Properties**: Tests reactive computed properties for authentication state

**Coverage**: 17 test cases covering all authentication store functionality

#### 2. Router Guards Tests (`src/tests/router/guards.test.ts`)

Tests the Vue Router navigation guards for authentication and authorization:

- **Authentication Guard**: Tests access control for protected routes
- **Role-based Access Control**: Tests role-based route restrictions
- **Guest Guard**: Tests redirection logic for authenticated users
- **Home Route Redirect**: Tests default route redirection
- **Complex Navigation Scenarios**: Tests edge cases and error handling

**Coverage**: 18 test cases covering all router guard scenarios

#### 3. Login Component Tests (`src/tests/views/Login.test.ts`)

Tests the Login Vue component functionality:

- **Rendering**: Tests correct form rendering and UI elements
- **Form Validation**: Tests input validation and error states
- **Login Process**: Tests successful login flow and error handling
- **Language Switching**: Tests internationalization functionality
- **User Experience**: Tests loading states, keyboard navigation, and redirects

**Coverage**: 16 test cases covering all login component functionality

### Dashboard Interface Tests

#### 4. Dashboard Service Tests (`src/tests/services/dashboardService.test.ts`)

Tests the dashboard data service functionality:

- **getDashboardData**: Tests fetching dashboard data with timestamp conversion
- **getUserStatistics**: Tests admin-only user statistics retrieval
- **getSystemHealth**: Tests admin-only system health monitoring
- **Error Handling**: Tests network errors, API errors, and edge cases
- **Error Logging**: Tests proper error logging to console

**Coverage**: 24 test cases covering all dashboard service functionality

#### 5. Dashboard Component Tests (`src/tests/views/Dashboard.test.ts`)

Tests the Dashboard Vue component functionality:

- **Loading and Error States**: Tests loading skeletons, error alerts, and retry functionality
- **Admin Dashboard**: Tests admin-specific statistics, features, and sections
- **Buyer Dashboard**: Tests buyer-specific statistics and features
- **Supplier Dashboard**: Tests supplier-specific statistics and features
- **Feature Navigation**: Tests navigation to different system features
- **Recent Activities**: Tests activity display and formatting
- **Responsive Design**: Tests responsive layout classes
- **Internationalization**: Tests multi-language support
- **Error Handling**: Tests network and API error scenarios
- **Component Lifecycle**: Tests data loading on mount and role-based behavior

**Coverage**: 26 test cases covering all dashboard component functionality

## Key Features Tested

### Authentication Flow
- ✅ User login with credentials validation
- ✅ JWT token management and storage
- ✅ Automatic token verification and refresh
- ✅ Secure logout with state cleanup

### Authorization
- ✅ Role-based access control (admin, buyer, supplier)
- ✅ Route protection and redirection
- ✅ Permission validation for different user roles

### Dashboard Interface
- ✅ Role-based dashboard views and statistics
- ✅ Real-time data loading with error handling
- ✅ Feature navigation and access control
- ✅ Recent activities display and formatting
- ✅ Admin-only sections (user statistics, system health)
- ✅ Responsive design and mobile compatibility

### User Experience
- ✅ Form validation with real-time feedback
- ✅ Loading states during data fetching
- ✅ Error handling with user-friendly messages
- ✅ Language switching (Chinese/Japanese)
- ✅ Keyboard navigation support
- ✅ Responsive design for different screen sizes

### Security
- ✅ Token expiration handling
- ✅ Automatic logout on authentication failure
- ✅ Secure credential handling
- ✅ Protected route access control
- ✅ Role-based feature access

## Test Utilities

### Mocking Strategy
- **localStorage**: Custom mock implementation for browser storage
- **axios**: Comprehensive HTTP client mocking
- **Vue Router**: Navigation and guard testing
- **Element Plus**: UI component mocking
- **i18n**: Internationalization mocking
- **Services**: API service mocking with realistic data

### Test Setup
- **Pinia**: State management testing with store isolation
- **Vue Test Utils**: Component mounting and interaction testing
- **Vitest**: Modern testing framework with TypeScript support
- **Test Data**: Comprehensive mock data for different user roles

## Running Tests

```bash
# Run all frontend tests
npm test

# Run authentication tests
npm test -- --run src/tests/stores/auth.test.ts src/tests/router/guards.test.ts src/tests/views/Login.test.ts

# Run dashboard tests
npm test -- --run src/tests/services/dashboardService.test.ts src/tests/views/Dashboard.test.ts

# Run individual test suites
npm test -- --run src/tests/stores/auth.test.ts           # Auth store tests
npm test -- --run src/tests/router/guards.test.ts         # Router guard tests
npm test -- --run src/tests/views/Login.test.ts           # Login component tests
npm test -- --run src/tests/services/dashboardService.test.ts  # Dashboard service tests
npm test -- --run src/tests/views/Dashboard.test.ts       # Dashboard component tests
```

## Test Results Summary

- **Authentication Interface**: 51 test cases (100% pass rate)
- **Dashboard Interface**: 50 test cases (100% pass rate)
- **Total Coverage**: 101 test cases covering all implemented features

All tests pass successfully, providing comprehensive coverage of the frontend implementation according to requirements 1.2 and 1.5.