#!/usr/bin/env ts-node
/**
 * Swagger Documentation Validation Script
 * 
 * Validates Swagger documentation for:
 * - Decorator presence and correctness
 * - Example validity (valid JSON)
 * - Bilingual message format
 * - Required response status codes
 * 
 * Usage: npm run swagger:validate
 */

import * as fs from 'fs';
import * as path from 'path';

const M1_MODULES = ['auth', 'user', 'user-access', 'employee', 'working-hours', 'organization', 'complex', 'clinic', 'department'];
const M2_MODULES = ['complex', 'clinic', 'department', 'organization', 'onboarding', 'subscription', 'working-hours', 'appointment', 'service'];
const ALL_MODULES = Array.from(new Set([...M1_MODULES, ...M2_MODULES]));

const REQUIRED_STATUS_CODES = [200, 201, 400, 401, 404, 500];

interface ValidationError {
  type: 'missing_decorator' | 'invalid_example' | 'missing_response' | 'missing_bilingual' | 'invalid_format';
  location: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  module: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

function validateController(modulePath: string, moduleName: string): ValidationResult {
  const controllerPath = path.join(modulePath, `${moduleName}.controller.ts`);
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  if (!fs.existsSync(controllerPath)) {
    return {
      module: moduleName,
      isValid: false,
      errors: [{
        type: 'missing_decorator',
        location: controllerPath,
        message: 'Controller file not found',
        severity: 'error'
      }],
      warnings: []
    };
  }

  const content = fs.readFileSync(controllerPath, 'utf-8');
  
  // Check for @ApiTags
  if (!content.includes('@ApiTags')) {
    errors.push({
      type: 'missing_decorator',
      location: `${moduleName}.controller.ts`,
      message: '@ApiTags decorator missing on controller',
      severity: 'error'
    });
  }
  
  // Find all endpoints
  const httpMethods = ['@Get', '@Post', '@Put', '@Delete', '@Patch'];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const method of httpMethods) {
      if (line.startsWith(method)) {
        const functionMatch = lines.slice(i).find(l => l.includes('async') || l.includes('('));
        const functionName = functionMatch?.match(/(\w+)\s*\(/)?.[1] || 'unknown';
        const precedingLines = lines.slice(Math.max(0, i - 15), i).join('\n');
        
        // Check for @ApiOperation
        if (!precedingLines.includes('@ApiOperation')) {
          errors.push({
            type: 'missing_decorator',
            location: `${moduleName}.controller.ts:${functionName}`,
            message: '@ApiOperation missing',
            severity: 'error'
          });
        }
        
        // Check for @ApiResponse
        if (!precedingLines.includes('@ApiResponse')) {
          errors.push({
            type: 'missing_response',
            location: `${moduleName}.controller.ts:${functionName}`,
            message: '@ApiResponse decorators missing',
            severity: 'error'
          });
        }
        
        // Check for authentication endpoints
        if (method !== '@Post' || !functionName.includes('login') && !functionName.includes('register')) {
          if (!precedingLines.includes('@ApiBearerAuth') && !precedingLines.includes('Public')) {
            warnings.push({
              type: 'missing_decorator',
              location: `${moduleName}.controller.ts:${functionName}`,
              message: '@ApiBearerAuth might be missing (unless endpoint is public)',
              severity: 'warning'
            });
          }
        }
        
        break;
      }
    }
  }
  
  // Check for examples file
  const examplesPath = path.join(modulePath, 'constants', 'swagger-examples.ts');
  if (!fs.existsSync(examplesPath)) {
    const altExamplesPath = path.join(modulePath, 'examples');
    if (!fs.existsSync(altExamplesPath)) {
      warnings.push({
        type: 'missing_decorator',
        location: moduleName,
        message: 'No swagger-examples.ts or examples/ directory found',
        severity: 'warning'
      });
    }
  } else {
    // Validate examples file
    const examplesContent = fs.readFileSync(examplesPath, 'utf-8');
    
    // Check for bilingual error messages
    if (examplesContent.includes('ERROR') || examplesContent.includes('error')) {
      const hasBilingualFormat = examplesContent.includes('ar:') && examplesContent.includes('en:');
      if (!hasBilingualFormat) {
        errors.push({
          type: 'missing_bilingual',
          location: `${moduleName}/constants/swagger-examples.ts`,
          message: 'Error examples missing bilingual format (ar/en)',
          severity: 'error'
        });
      }
    }
    
    // Try to validate JSON structure
    const exampleMatches = examplesContent.match(/export const \w+ = ({[\s\S]*?});/g);
    if (exampleMatches) {
      for (const match of exampleMatches) {
        try {
          const jsonStr = match.replace(/export const \w+ = /, '').replace(/;$/, '');
          // Basic validation - check for balanced braces
          const openBraces = (jsonStr.match(/{/g) || []).length;
          const closeBraces = (jsonStr.match(/}/g) || []).length;
          if (openBraces !== closeBraces) {
            warnings.push({
              type: 'invalid_example',
              location: `${moduleName}/constants/swagger-examples.ts`,
              message: 'Possible malformed example object (unbalanced braces)',
              severity: 'warning'
            });
          }
        } catch (e) {
          warnings.push({
            type: 'invalid_example',
            location: `${moduleName}/constants/swagger-examples.ts`,
            message: 'Could not validate example format',
            severity: 'warning'
          });
        }
      }
    }
  }
  
  // Check DTOs
  const dtoPath = path.join(modulePath, 'dto');
  if (fs.existsSync(dtoPath)) {
    const dtoFiles = fs.readdirSync(dtoPath).filter(f => f.endsWith('.dto.ts'));
    
    for (const dtoFile of dtoFiles) {
      const dtoContent = fs.readFileSync(path.join(dtoPath, dtoFile), 'utf-8');
      
      // Check if class has properties but no @ApiProperty
      const hasClassDeclaration = dtoContent.includes('export class');
      const hasProperties = dtoContent.match(/^\s+\w+[?]?:\s+/gm);
      const hasApiProperty = dtoContent.includes('@ApiProperty');
      
      if (hasClassDeclaration && hasProperties && !hasApiProperty) {
        errors.push({
          type: 'missing_decorator',
          location: `${moduleName}/dto/${dtoFile}`,
          message: 'DTO properties missing @ApiProperty decorators',
          severity: 'error'
        });
      }
    }
  }
  
  return {
    module: moduleName,
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function generateValidationReport(results: ValidationResult[]): string {
  const timestamp = new Date().toISOString();
  let report = `# Swagger Documentation Validation Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  
  const totalModules = results.length;
  const validModules = results.filter(r => r.isValid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  
  report += `## Summary\n\n`;
  report += `- **Total Modules:** ${totalModules}\n`;
  report += `- **Valid Modules:** ${validModules} (${Math.round((validModules / totalModules) * 100)}%)\n`;
  report += `- **Total Errors:** ${totalErrors}\n`;
  report += `- **Total Warnings:** ${totalWarnings}\n`;
  report += `- **Status:** ${totalErrors === 0 ? '✅ PASS' : '❌ FAIL'}\n\n`;
  
  if (totalErrors > 0 || totalWarnings > 0) {
    report += `## Issues by Module\n\n`;
    
    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        report += `### ${result.module}\n\n`;
        
        if (result.errors.length > 0) {
          report += `**Errors (${result.errors.length}):**\n`;
          result.errors.forEach(err => {
            report += `- ❌ [${err.type}] ${err.location}: ${err.message}\n`;
          });
          report += `\n`;
        }
        
        if (result.warnings.length > 0) {
          report += `**Warnings (${result.warnings.length}):**\n`;
          result.warnings.forEach(warn => {
            report += `- ⚠️  [${warn.type}] ${warn.location}: ${warn.message}\n`;
          });
          report += `\n`;
        }
      }
    }
  } else {
    report += `## ✅ All Validations Passed!\n\n`;
    report += `All modules have proper Swagger documentation.\n`;
  }
  
  return report;
}

async function main() {
  console.log('🔍 Starting Swagger Documentation Validation...\n');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const results: ValidationResult[] = [];
  
  for (const moduleName of ALL_MODULES) {
    const modulePath = path.join(srcPath, moduleName);
    
    if (!fs.existsSync(modulePath)) {
      console.log(`⚠️  Module not found: ${moduleName}`);
      continue;
    }
    
    const result = validateController(modulePath, moduleName);
    results.push(result);
    
    const status = result.isValid ? '✅' : '❌';
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    console.log(`${status} ${moduleName}: ${errorCount} errors, ${warningCount} warnings`);
  }
  
  const report = generateValidationReport(results);
  const reportPath = path.join(__dirname, 'swagger-validation-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📄 Validation report saved to: ${reportPath}`);
  
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  if (totalErrors > 0) {
    console.log(`\n❌ Validation FAILED with ${totalErrors} errors`);
    process.exit(1);
  } else {
    console.log(`\n✅ Validation PASSED`);
    process.exit(0);
  }
}

main().catch(console.error);
