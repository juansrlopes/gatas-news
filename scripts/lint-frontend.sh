#!/bin/bash

cd apps/frontend

echo "🔍 Linting frontend TypeScript files..."

# Count files to be checked
file_count=$(find src/pages src/components src/config -name '*.ts' -o -name '*.tsx' | wc -l | tr -d ' ')
echo "📁 Checking $file_count files..."

# Run ESLint and capture output
output=$(npx eslint src/pages src/components src/config --ext .ts,.tsx --config ../../eslint.config.js --ignore-pattern '**/__tests__/**' 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "✅ Linting completed: $file_count files checked, 0 errors, 0 warnings"
else
    echo "❌ Linting found issues:"
    echo "$output"
    
    # Count errors and warnings
    error_count=$(echo "$output" | grep -c "error" || echo "0")
    warning_count=$(echo "$output" | grep -c "warning" || echo "0")
    
    echo ""
    echo "📊 Summary: $file_count files checked, $error_count errors, $warning_count warnings"
fi

exit $exit_code
