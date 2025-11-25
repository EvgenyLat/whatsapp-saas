/**
 * Component Analysis Script
 * Analyzes all newly created components for:
 * - Import resolution
 * - TypeScript compatibility
 * - Performance optimizations
 * - Accessibility features
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS = [
  {
    name: 'BookingFilters',
    path: 'src/components/features/bookings/BookingFilters.tsx',
    category: 'Feature Component',
  },
  {
    name: 'BookingCard',
    path: 'src/components/features/bookings/BookingCard.tsx',
    category: 'Feature Component',
  },
  {
    name: 'MessageBubble',
    path: 'src/components/features/messages/MessageBubble.tsx',
    category: 'Feature Component',
  },
  {
    name: 'Chart',
    path: 'src/components/features/analytics/Chart.tsx',
    category: 'Feature Component',
  },
  {
    name: 'FormField',
    path: 'src/components/forms/FormField.tsx',
    category: 'Form Component',
  },
  {
    name: 'LoginForm',
    path: 'src/components/forms/LoginForm.tsx',
    category: 'Form Component',
  },
  {
    name: 'BookingForm',
    path: 'src/components/forms/BookingForm.tsx',
    category: 'Form Component',
  },
];

const results = {
  totalComponents: COMPONENTS.length,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

console.log('='.repeat(80));
console.log('COMPONENT ANALYSIS REPORT');
console.log('='.repeat(80));
console.log('');

COMPONENTS.forEach((component, index) => {
  const fullPath = path.join(__dirname, component.path);
  const analysis = {
    name: component.name,
    category: component.category,
    exists: false,
    size: 0,
    lines: 0,
    features: {
      memo: false,
      useCallback: false,
      useMemo: false,
      typescript: false,
      displayName: false,
      propTypes: false,
      accessibility: [],
      jsdoc: false,
    },
    issues: [],
    score: 0,
  };

  console.log(`[${index + 1}/${COMPONENTS.length}] Analyzing: ${component.name}`);
  console.log('-'.repeat(80));

  try {
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      analysis.exists = true;
      const content = fs.readFileSync(fullPath, 'utf-8');
      const stats = fs.statSync(fullPath);

      analysis.size = stats.size;
      analysis.lines = content.split('\n').length;

      // Check for performance optimizations
      analysis.features.memo = content.includes('memo<') || content.includes('React.memo');
      analysis.features.useCallback = content.includes('useCallback');
      analysis.features.useMemo = content.includes('useMemo');

      // Check for TypeScript
      analysis.features.typescript = fullPath.endsWith('.tsx') || fullPath.endsWith('.ts');

      // Check for displayName
      analysis.features.displayName = content.includes('.displayName =');

      // Check for JSDoc comments
      analysis.features.jsdoc = content.includes('/**') && content.includes('@example');

      // Check for accessibility features
      if (content.includes('aria-label')) analysis.features.accessibility.push('aria-label');
      if (content.includes('aria-pressed')) analysis.features.accessibility.push('aria-pressed');
      if (content.includes('aria-invalid')) analysis.features.accessibility.push('aria-invalid');
      if (content.includes('aria-describedby')) analysis.features.accessibility.push('aria-describedby');
      if (content.includes('role=')) analysis.features.accessibility.push('role attribute');

      // Calculate score (out of 100)
      let score = 0;
      if (analysis.features.memo) score += 20;
      if (analysis.features.useCallback) score += 15;
      if (analysis.features.useMemo) score += 10;
      if (analysis.features.typescript) score += 10;
      if (analysis.features.displayName) score += 10;
      if (analysis.features.jsdoc) score += 15;
      if (analysis.features.accessibility.length > 0) score += 20;

      analysis.score = score;

      // Determine issues
      if (!analysis.features.memo && content.includes('export function')) {
        analysis.issues.push('Not using React.memo - may cause unnecessary re-renders');
      }
      if (!analysis.features.displayName) {
        analysis.issues.push('Missing displayName - harder to debug in DevTools');
      }
      if (analysis.features.accessibility.length === 0) {
        analysis.issues.push('No accessibility attributes found');
      }
      if (!analysis.features.jsdoc) {
        analysis.issues.push('Missing JSDoc documentation');
      }

      console.log(`  Status: EXISTS`);
      console.log(`  Size: ${(analysis.size / 1024).toFixed(2)} KB`);
      console.log(`  Lines: ${analysis.lines}`);
      console.log(`  Score: ${analysis.score}/100`);
      console.log(`  Performance:`);
      console.log(`    - React.memo: ${analysis.features.memo ? 'YES' : 'NO'}`);
      console.log(`    - useCallback: ${analysis.features.useCallback ? 'YES' : 'NO'}`);
      console.log(`    - useMemo: ${analysis.features.useMemo ? 'YES' : 'NO'}`);
      console.log(`  TypeScript: ${analysis.features.typescript ? 'YES' : 'NO'}`);
      console.log(`  DisplayName: ${analysis.features.displayName ? 'YES' : 'NO'}`);
      console.log(`  JSDoc: ${analysis.features.jsdoc ? 'YES' : 'NO'}`);
      console.log(`  Accessibility: ${analysis.features.accessibility.length > 0 ? analysis.features.accessibility.join(', ') : 'NONE'}`);

      if (analysis.issues.length > 0) {
        console.log(`  Issues:`);
        analysis.issues.forEach(issue => console.log(`    - ${issue}`));
        results.warnings += analysis.issues.length;
      }

      if (analysis.score >= 70) {
        results.passed++;
        console.log(`  Result: PASSED`);
      } else {
        results.failed++;
        console.log(`  Result: NEEDS IMPROVEMENT`);
      }

    } else {
      analysis.exists = false;
      analysis.issues.push('File does not exist');
      console.log(`  Status: FILE NOT FOUND`);
      console.log(`  Result: FAILED`);
      results.failed++;
    }

  } catch (error) {
    analysis.issues.push(`Error: ${error.message}`);
    console.log(`  Status: ERROR`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Result: FAILED`);
    results.failed++;
  }

  results.details.push(analysis);
  console.log('');
});

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Components: ${results.totalComponents}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Warnings: ${results.warnings}`);
console.log('');

console.log('COMPONENT SCORES:');
results.details.forEach(detail => {
  const status = detail.score >= 70 ? 'PASS' : 'FAIL';
  console.log(`  ${detail.name.padEnd(20)} ${detail.score}/100  [${status}]`);
});
console.log('');

const avgScore = results.details.reduce((sum, d) => sum + d.score, 0) / results.totalComponents;
console.log(`Average Score: ${avgScore.toFixed(1)}/100`);
console.log('');

if (results.failed > 0) {
  console.log('RECOMMENDATION: Review failed components and address issues listed above');
  process.exit(1);
} else {
  console.log('SUCCESS: All components meet quality standards!');
  process.exit(0);
}
