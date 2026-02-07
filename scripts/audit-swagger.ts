#!/usr/bin/env ts-node
/**
 * Swagger Documentation Audit Script
 * 
 * Audits controller files and DTOs for Swagger documentation completeness
 * Usage: npm run swagger:audit
 */

import * as fs from 'fs';
import * as path from 'path';

const M1_MODULES = ['auth', 'user', 'user-access', 'employee', 'working-hours', 'organization', 'complex', 'clinic', 'department'];
const M2_MODULES = ['complex', 'clinic', 'department', 'organization', 'onboarding', 'subscription', 'working-hours', 'appointment', 'service'];
const ALL_MODULES = Array.from(new Set([...M1_MODULES, ...M2_MODULES]));

interface EndpointAudit {
  method: string;
  path: string;
  functionName: string;
  hasApiOperation: boolean;
  hasApiResponse: boolean;
  responseStatuses: number[];
  missingDecorators: string[];
}

interface ModuleAudit {
  module: string;
  hasApiTags: boolean;
  endpoints: EndpointAudit[];
  coveragePercentage: number;
  missingElements: string[];
}

function auditController(modulePath: string, moduleName: string): ModuleAudit | null {
  const controllerPath = path.join(modulePath, `${moduleName}.controller.ts`);
  
  if (!fs.existsSync(controllerPath)) {
    return null;
  }

  const content = fs.readFileSync(controllerPath, 'utf-8');
  const hasApiTags = content.includes('@ApiTags');
  
  const endpoints: EndpointAudit[] = [];
  const httpMethods = ['@Get', '@Post', '@Put', '@Delete', '@Patch'];
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const method of httpMethods) {
      if (line.startsWith(method)) {
        const functionMatch = lines.slice(i).find(l => l.includes('async') || l.includes('('));
        const functionName = functionMatch?.match(/(\w+)\s*\(/)?.[1] || 'unknown';
        
        const precedingLines = lines.slice(Math.max(0, i - 10), i).join('\n');
        
        const endpoint: EndpointAudit = {
          method: method.substring(1),
          path: line.match(/\(['"](.+?)['"]\)/)?.[1] || '',
          functionName,
          hasApiOperation: precedingLines.includes('@ApiOperation'),
          hasApiResponse: precedingLines.includes('@ApiResponse'),
          responseStatuses: [],
          missingDecorators: []
        };
        
        if (!endpoint.hasApiOperation) endpoint.missingDecorators.push('@ApiOperation');
        if (!endpoint.hasApiResponse) endpoint.missingDecorators.push('@ApiResponse');
        
        endpoints.push(endpoint);
        break;
      }
    }
  }
  
  const totalChecks = endpoints.length * 2 + 1;
  const passedChecks = (hasApiTags ? 1 : 0) + 
    endpoints.filter(e => e.hasApiOperation).length +
    endpoints.filter(e => e.hasApiResponse).length;
  
  const coveragePercentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  
  const missingElements: string[] = [];
  if (!hasApiTags) missingElements.push('@ApiTags on controller');
  endpoints.forEach(e => {
    if (e.missingDecorators.length > 0) {
      missingElements.push(`${e.method} ${e.path || e.functionName}: ${e.missingDecorators.join(', ')}`);
    }
  });
  
  return {
    module: moduleName,
    hasApiTags,
    endpoints,
    coveragePercentage,
    missingElements
  };
}

function generateReport(modules: ModuleAudit[]): string {
  const timestamp = new Date().toISOString();
  let report = `# Swagger Documentation Audit Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `## Summary\n\n`;
  
  const totalModules = modules.length;
  const totalEndpoints = modules.reduce((sum, m) => sum + m.endpoints.length, 0);
  const avgCoverage = Math.round(modules.reduce((sum, m) => sum + m.coveragePercentage, 0) / totalModules);
  
  report += `- **Total Modules Audited:** ${totalModules}\n`;
  report += `- **Total Endpoints:** ${totalEndpoints}\n`;
  report += `- **Average Coverage:** ${avgCoverage}%\n\n`;
  
  report += `## Module Details\n\n`;
  
  modules.sort((a, b) => a.coveragePercentage - b.coveragePercentage);
  
  for (const module of modules) {
    report += `### ${module.module} (${module.coveragePercentage}% coverage)\n\n`;
    report += `- **@ApiTags:** ${module.hasApiTags ? '✅' : '❌'}\n`;
    report += `- **Endpoints:** ${module.endpoints.length}\n`;
    
    if (module.missingElements.length > 0) {
      report += `\n**Missing Elements:**\n`;
      module.missingElements.forEach(elem => {
        report += `- ${elem}\n`;
      });
    }
    report += `\n`;
  }
  
  return report;
}

async function main() {
  console.log('🔍 Starting Swagger Documentation Audit...\n');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const audits: ModuleAudit[] = [];
  
  for (const moduleName of ALL_MODULES) {
    const modulePath = path.join(srcPath, moduleName);
    
    if (!fs.existsSync(modulePath)) {
      console.log(`⚠️  Module not found: ${moduleName}`);
      continue;
    }
    
    const audit = auditController(modulePath, moduleName);
    if (audit) {
      audits.push(audit);
      console.log(`✓ Audited ${moduleName}: ${audit.coveragePercentage}% coverage`);
    }
  }
  
  const report = generateReport(audits);
  const reportPath = path.join(__dirname, 'swagger-audit-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n✅ Audit complete! Report saved to: ${reportPath}`);
  console.log(`\n📊 Overall Statistics:`);
  console.log(`   - Modules audited: ${audits.length}`);
  console.log(`   - Average coverage: ${Math.round(audits.reduce((sum, a) => sum + a.coveragePercentage, 0) / audits.length)}%`);
}

main().catch(console.error);
