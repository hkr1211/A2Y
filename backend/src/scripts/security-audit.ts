#!/usr/bin/env ts-node

/**
 * Security Audit Script
 * Performs comprehensive security checks on the application
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];

  async runAudit(): Promise<void> {
    console.log('🔍 Starting Security Audit...\n');

    await this.checkDependencyVulnerabilities();
    await this.checkFilePermissions();
    await this.checkEnvironmentVariables();
    await this.checkDatabaseSecurity();
    await this.checkCodeVulnerabilities();
    await this.checkConfigurationSecurity();
    await this.checkPasswordPolicies();
    await this.checkLoggingSecurity();

    this.generateReport();
  }

  private async checkDependencyVulnerabilities(): Promise<void> {
    console.log('📦 Checking dependency vulnerabilities...');
    
    try {
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
          if (vuln.severity === 'high' || vuln.severity === 'critical') {
            this.issues.push({
              severity: vuln.severity,
              category: 'Dependencies',
              description: `Vulnerable dependency: ${pkg} - ${vuln.title}`,
              recommendation: `Update ${pkg} to version ${vuln.fixAvailable?.version || 'latest'}`
            });
          }
        });
      }
    } catch (error) {
      console.warn('Could not run npm audit:', (error as Error).message);
    }
  }

  private async checkFilePermissions(): Promise<void> {
    console.log('📁 Checking file permissions...');
    
    const sensitiveFiles = [
      '.env',
      '.env.example',
      'package.json',
      'tsconfig.json'
    ];

    for (const file of sensitiveFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode & parseInt('044', 8)) { // World readable
          this.issues.push({
            severity: 'medium',
            category: 'File Permissions',
            description: `File ${file} is world-readable`,
            file: file,
            recommendation: 'Restrict file permissions to owner only'
          });
        }
      }
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    console.log('🔐 Checking environment variables...');
    
    const requiredSecureVars = [
      'JWT_SECRET',
      'DATABASE_PASSWORD',
      'ENCRYPTION_KEY'
    ];

    const weakSecrets = [
      'secret',
      'password',
      '123456',
      'admin',
      'default'
    ];

    for (const varName of requiredSecureVars) {
      const value = process.env[varName];
      
      if (!value) {
        this.issues.push({
          severity: 'high',
          category: 'Environment',
          description: `Missing required environment variable: ${varName}`,
          recommendation: `Set ${varName} with a strong, random value`
        });
      } else if (value.length < 32) {
        this.issues.push({
          severity: 'medium',
          category: 'Environment',
          description: `Environment variable ${varName} is too short`,
          recommendation: `Use at least 32 characters for ${varName}`
        });
      } else if (weakSecrets.some(weak => value.toLowerCase().includes(weak))) {
        this.issues.push({
          severity: 'high',
          category: 'Environment',
          description: `Environment variable ${varName} contains weak patterns`,
          recommendation: `Use a cryptographically secure random value for ${varName}`
        });
      }
    }

    // Check if .env file exists in production
    if (process.env.NODE_ENV === 'production' && fs.existsSync('.env')) {
      this.issues.push({
        severity: 'medium',
        category: 'Environment',
        description: '.env file exists in production environment',
        recommendation: 'Use environment-specific configuration management'
      });
    }
  }

  private async checkDatabaseSecurity(): Promise<void> {
    console.log('🗄️  Checking database security...');
    
    try {
      // Check for default passwords
      const defaultUsers = await pool.query(`
        SELECT username FROM users 
        WHERE username IN ('admin', 'root', 'test') 
        AND password = crypt('admin123', password)
      `);

      if (defaultUsers.rows.length > 0) {
        this.issues.push({
          severity: 'critical',
          category: 'Database',
          description: 'Default passwords detected in database',
          recommendation: 'Change all default passwords immediately'
        });
      }

      // Check for SQL injection vulnerabilities in stored procedures
      const procedures = await pool.query(`
        SELECT routine_name, routine_definition 
        FROM information_schema.routines 
        WHERE routine_type = 'FUNCTION'
      `);

      procedures.rows.forEach(proc => {
        if (proc.routine_definition?.includes('EXECUTE') || 
            proc.routine_definition?.includes('eval')) {
          this.issues.push({
            severity: 'high',
            category: 'Database',
            description: `Potentially unsafe database function: ${proc.routine_name}`,
            recommendation: 'Review and sanitize database functions'
          });
        }
      });

      // Check database connection security
      const connectionInfo = await pool.query('SELECT current_setting(\'ssl\') as ssl_enabled');
      if (connectionInfo.rows[0]?.ssl_enabled !== 'on') {
        this.issues.push({
          severity: 'medium',
          category: 'Database',
          description: 'Database connection is not using SSL',
          recommendation: 'Enable SSL for database connections'
        });
      }

    } catch (error) {
      console.warn('Could not check database security:', (error as Error).message);
    }
  }

  private async checkCodeVulnerabilities(): Promise<void> {
    console.log('💻 Checking code vulnerabilities...');
    
    const sourceFiles = this.getSourceFiles('src');
    
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for hardcoded secrets
        const secretPatterns = [
          /password\s*=\s*['"][^'"]+['"]/i,
          /secret\s*=\s*['"][^'"]+['"]/i,
          /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
          /token\s*=\s*['"][^'"]+['"]/i
        ];

        secretPatterns.forEach(pattern => {
          if (pattern.test(line) && !line.includes('process.env')) {
            this.issues.push({
              severity: 'high',
              category: 'Code Security',
              description: 'Hardcoded secret detected',
              file: file,
              line: index + 1,
              recommendation: 'Move secrets to environment variables'
            });
          }
        });

        // Check for unsafe functions
        const unsafeFunctions = [
          'eval(',
          'Function(',
          'setTimeout(',
          'setInterval(',
          'innerHTML',
          'outerHTML'
        ];

        unsafeFunctions.forEach(func => {
          if (line.includes(func)) {
            this.issues.push({
              severity: 'medium',
              category: 'Code Security',
              description: `Potentially unsafe function: ${func}`,
              file: file,
              line: index + 1,
              recommendation: 'Review usage and consider safer alternatives'
            });
          }
        });

        // Check for console.log in production code
        if (line.includes('console.log') && !file.includes('test')) {
          this.issues.push({
            severity: 'low',
            category: 'Information Disclosure',
            description: 'Console.log statement in production code',
            file: file,
            line: index + 1,
            recommendation: 'Remove or replace with proper logging'
          });
        }
      });
    }
  }

  private async checkConfigurationSecurity(): Promise<void> {
    console.log('⚙️  Checking configuration security...');
    
    // Check CORS configuration
    const serverFile = path.join(process.cwd(), 'src/server.ts');
    if (fs.existsSync(serverFile)) {
      const content = fs.readFileSync(serverFile, 'utf8');
      
      if (content.includes('origin: "*"') || content.includes("origin: '*'")) {
        this.issues.push({
          severity: 'high',
          category: 'Configuration',
          description: 'CORS configured to allow all origins',
          file: 'src/server.ts',
          recommendation: 'Restrict CORS to specific trusted origins'
        });
      }
    }

    // Check for debug mode in production
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG) {
      this.issues.push({
        severity: 'medium',
        category: 'Configuration',
        description: 'Debug mode enabled in production',
        recommendation: 'Disable debug mode in production environment'
      });
    }

    // Check JWT configuration
    if (!process.env.JWT_EXPIRES_IN) {
      this.issues.push({
        severity: 'medium',
        category: 'Configuration',
        description: 'JWT expiration not configured',
        recommendation: 'Set appropriate JWT expiration time'
      });
    }
  }

  private async checkPasswordPolicies(): Promise<void> {
    console.log('🔒 Checking password policies...');
    
    try {
      // Check for weak passwords in database
      const weakPasswords = await pool.query(`
        SELECT username, length(password) as pwd_length 
        FROM users 
        WHERE length(password) < 60
      `);

      if (weakPasswords.rows.length > 0) {
        this.issues.push({
          severity: 'high',
          category: 'Password Security',
          description: 'Users with potentially unhashed passwords detected',
          recommendation: 'Ensure all passwords are properly hashed'
        });
      }

      // Check password validation in code
      const authFiles = this.getSourceFiles('src').filter(f => 
        f.includes('auth') || f.includes('user') || f.includes('password')
      );

      let hasPasswordValidation = false;
      for (const file of authFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('password') && 
            (content.includes('length') || content.includes('regex') || content.includes('validate'))) {
          hasPasswordValidation = true;
          break;
        }
      }

      if (!hasPasswordValidation) {
        this.issues.push({
          severity: 'medium',
          category: 'Password Security',
          description: 'No password complexity validation found',
          recommendation: 'Implement password complexity requirements'
        });
      }

    } catch (error) {
      console.warn('Could not check password policies:', (error as Error).message);
    }
  }

  private async checkLoggingSecurity(): Promise<void> {
    console.log('📝 Checking logging security...');
    
    const logFiles = this.getSourceFiles('src').filter(f => 
      f.includes('log') || f.includes('audit')
    );

    let hasSecurityLogging = false;
    for (const file of logFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('security') || content.includes('auth') || content.includes('violation')) {
        hasSecurityLogging = true;
        break;
      }
    }

    if (!hasSecurityLogging) {
      this.issues.push({
        severity: 'medium',
        category: 'Logging',
        description: 'No security event logging detected',
        recommendation: 'Implement comprehensive security event logging'
      });
    }

    // Check for sensitive data in logs
    for (const file of logFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i
      ];

      sensitivePatterns.forEach(pattern => {
        if (pattern.test(content) && content.includes('log')) {
          this.issues.push({
            severity: 'medium',
            category: 'Logging',
            description: 'Potential sensitive data logging',
            file: file,
            recommendation: 'Ensure sensitive data is not logged'
          });
        }
      });
    }
  }

  private getSourceFiles(dir: string): string[] {
    const files: string[] = [];
    
    const scan = (currentDir: string) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }

  private generateReport(): void {
    console.log('\n📊 Security Audit Report');
    console.log('========================\n');

    const severityCounts = {
      critical: this.issues.filter(i => i.severity === 'critical').length,
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length
    };

    console.log('Summary:');
    console.log(`🔴 Critical: ${severityCounts.critical}`);
    console.log(`🟠 High: ${severityCounts.high}`);
    console.log(`🟡 Medium: ${severityCounts.medium}`);
    console.log(`🟢 Low: ${severityCounts.low}`);
    console.log(`📊 Total Issues: ${this.issues.length}\n`);

    if (this.issues.length === 0) {
      console.log('✅ No security issues found!');
      return;
    }

    // Group issues by category
    const categories = [...new Set(this.issues.map(i => i.category))];
    
    for (const category of categories) {
      const categoryIssues = this.issues.filter(i => i.category === category);
      console.log(`\n📂 ${category} (${categoryIssues.length} issues):`);
      console.log('─'.repeat(50));
      
      categoryIssues.forEach((issue, index) => {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity];
        
        console.log(`\n${index + 1}. ${severityIcon} ${issue.description}`);
        if (issue.file) {
          console.log(`   📁 File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        console.log(`   💡 Recommendation: ${issue.recommendation}`);
      });
    }

    // Generate JSON report
    const reportPath = path.join(process.cwd(), 'security-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: severityCounts,
      issues: this.issues
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with error code if critical or high severity issues found
    if (severityCounts.critical > 0 || severityCounts.high > 0) {
      console.log('\n❌ Security audit failed due to critical/high severity issues');
      process.exit(1);
    } else {
      console.log('\n✅ Security audit completed successfully');
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().catch(error => {
    console.error('Security audit failed:', error);
    process.exit(1);
  });
}

export { SecurityAuditor };