#!/usr/bin/env bash
# Run after API is running on port 8000.
# Tests "More articles" flow: clear DB, fetch (~30 Serper calls), show stats.

set -e
BASE="${BASE_URL:-http://localhost:8000}"

echo "=== 1. Clear articles ==="
curl -s -X DELETE "$BASE/api/v1/admin/articles/clear" -H "Content-Type: application/json" | jq -r '.message // .error // .' 2>/dev/null || { echo "API not reachable at $BASE"; exit 1; }

echo ""
echo "=== 2. Trigger multi-source fetch (~30 Serper batches) ==="
curl -s -X POST "$BASE/api/v1/admin/fetch/multi-source" -H "Content-Type: application/json" --max-time 300 | jq '{
  articlesProcessed: .data.articlesProcessed,
  newArticlesAdded: .data.newArticlesAdded,
  serper: .data.sources.serper,
  durationMs: .data.duration,
  errors: .data.errors
}' 2>/dev/null || { echo "Fetch failed or timeout"; exit 1; }

echo ""
echo "=== 3. Article stats ==="
curl -s "$BASE/api/v1/admin/articles/stats" | jq '{
  totalArticles: .data.totalArticles,
  activeArticles: .data.activeArticles,
  celebritiesWithArticles: (.data.articlesByCelebrity | length),
  sampleByCelebrity: (.data.articlesByCelebrity[:8])
}' 2>/dev/null || { echo "Stats failed"; exit 1; }

echo ""
echo "Done. Expect ~280-300+ Serper articles (vs ~50 before)."
