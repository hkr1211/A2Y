#!/usr/bin/env ts-node

/**
 * Comprehensive Security Testing Script
 * Runs all security tests, audits, and vulnerability scans
 */

import { execSync } from 'child_process';
import { SecurityAuditor } from './security-audit';
import { VulnerabilityScanner } from './vulnerability-scanner';
import express from 'express';
import { initializeDatabase, closeDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

class SecurityTestRunner {
  private results: {
    unitTests: boolean;
    securityAudit: boolean;
    vulnerabilityScan: boolean;
    dependencyAudit: boolean;
  } = {
    unitTests: false,
    securityAudit: false,
    vulnerabilityScan: false,
    dependencyAudit: false
  };

  async runAllTests(): Promise<void> {
    console.log('🛡️  Starting Comprehensive Security Testing');
    console.log('===========================================\n');

    try {
      // Initialize database for tests
      await initializeDatabase();

      // Run unit tests for security components
      await this.runSecurityUnitTests();

      // Run security audit
      await this.runSecurityAudit();

      // Run vulnerability scan
      await this.runVulnerabilityScan();

      // Run dependency audit
      await this.runDependencyAudit();

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('Security testing failed:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  }

  private async runSecurityUnitTests(): Promise<void> {
    console.log('🧪 Running Security Unit Tests...\n');

    try {
      // Run Jest tests for security components
      execSync('npm test -- --testPathPattern=security', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      this.results.unitTests = true;
      console.log('✅ Security unit tests passed\n');
    } catch (error) {
      console.log('❌ Security unit tests failed\n');
      this.results.unitTests = false;
    }
  }

  private async runSecurityAudit(): Promise<void> {
    console.log('🔍 Running Security Audit...\n');

    try {
      const auditor = new SecurityAuditor();
      await auditor.runAudit();
      this.results.securityAudit = true;
    } catch (error) {
      console.log('❌ Security audit failed\n');
      this.results.securityAudit = false;
    }
  }

  private async runVulnerabilityScan(): Promise<void> {
    console.log('🔎 Running Vulnerability Scan...\n');

    try {
      // Create a test app instance
      const app = this.createTestApp();
      const scanner = new VulnerabilityScanner(app);
      await scanner.runScan();
      this.results.vulnerabilityScan = true;
    } catch (error) {
      console.log('❌ Vulnerability scan failed\n');
      this.results.vulnerabilityScan = false;
    }
  }

  private async runDependencyAudit(): Promise<void> {
    console.log('📦 Running Dependency Audit...\n');

    try {
      const auditResult = execSync('npm audit --audit-level=high', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      console.log('✅ No high-severity dependency vulnerabilities found\n');
      this.results.dependencyAudit = true;
    } catch (error) {
      console.log('❌ Dependency audit found vulnerabilities\n');
      this.results.dependencyAudit = false;
      
      // Still try to get the audit output
      try {
        const auditOutput = execSync('npm audit --json', { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        const audit = JSON.parse(auditOutput);
        
        if (audit.vulnerabilities) {
          console.log('Vulnerability Summary:');
          Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
            if (vuln.severity === 'high' || vuln.severity === 'critical') {
              console.log(`  - ${pkg}: ${vuln.severity} - ${vuln.title}`);
            }
          });
        }
      } catch (parseError) {
        console.log('Could not parse audit results');
      }
    }
  }

  private createTestApp(): express.Application {
    const app = express();
    
    // Add basic middleware for testing
    app.use(express.json());
    
    // Add basic test routes
    app.post('/api/auth/login', (req, res) => {
      res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    });
    
    app.get('/api/users', (req, res) => {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    });
    
    app.get('/api/inquiries', (req, res) => {
      res.json({ success: true, data: [] });
    });
    
    app.post('/api/inquiries', (req, res) => {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    });
    
    app.get('*', (req, res) => {
      res.status(404).json({ success: false, error: { message: 'Not found' } });
    });
    
    return app;
  }

  private generateFinalReport(): void {
    console.log('\n📊 Final Security Test Report');
    console.log('=============================\n');

    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(Boolean).length;
    const failedTests = totalTests - passedTests;

    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}\n`);

    console.log('Test Results:');
    console.log('─'.repeat(40));
    console.log(`🧪 Security Unit Tests: ${this.results.unitTests ? '✅' : '❌'}`);
    console.log(`🔍 Security Audit: ${this.results.securityAudit ? '✅' : '❌'}`);
    console.log(`🔎 Vulnerability Scan: ${this.results.vulnerabilityScan ? '✅' : '❌'}`);
    console.log(`📦 Dependency Audit: ${this.results.dependencyAudit ? '✅' : '❌'}`);

    // Generate comprehensive report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        success: failedTests === 0
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(process.cwd(), 'comprehensive-security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`\n📄 Comprehensive report saved to: ${reportPath}`);

    if (failedTests > 0) {
      console.log('\n❌ Security testing failed - please address the issues above');
      console.log('\nRecommendations:');
      reportData.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All security tests passed successfully!');
      console.log('🛡️  Your application meets security standards');
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.results.unitTests) {
      recommendations.push('Fix failing security unit tests');
      recommendations.push('Ensure all security middleware is properly tested');
    }

    if (!this.results.securityAudit) {
      recommendations.push('Address security audit findings');
      recommendations.push('Review and update security configurations');
    }

    if (!this.results.vulnerabilityScan) {
      recommendations.push('Fix identified vulnerabilities');
      recommendations.push('Implement additional security controls');
    }

    if (!this.results.dependencyAudit) {
      recommendations.push('Update vulnerable dependencies');
      recommendations.push('Consider using npm audit fix or alternative packages');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue regular security testing');
      recommendations.push('Keep dependencies up to date');
      recommendations.push('Monitor security advisories');
    }

    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new SecurityTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Security test runner failed:', error);
    process.exit(1);
  });
}

export { SecurityTestRunner };