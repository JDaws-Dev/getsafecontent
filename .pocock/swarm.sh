#!/bin/bash
#
# Pocock Swarm - Parallel Analysis with Issue Creation
# Spawns multiple Claude instances with different perspectives,
# synthesizes findings, and creates Beads issues.
#
# Usage:
#   ./.pocock/swarm.sh "Evaluate the landing page for conversion optimization"
#   ./.pocock/swarm.sh "Find security vulnerabilities in the auth flow"
#   ./.pocock/swarm.sh "Analyze performance bottlenecks"
#
# The swarm will:
#   1. Launch 4-6 parallel Claude agents with different perspectives
#   2. Collect their findings
#   3. Synthesize into actionable issues
#   4. Create Beads issues automatically
#

set -e

cd "$(dirname "$0")/.."

if [[ -z "$1" ]]; then
    echo "Usage: ./.pocock/swarm.sh \"<goal or question>\""
    echo ""
    echo "Examples:"
    echo "  ./.pocock/swarm.sh \"Evaluate the landing page for conversion optimization\""
    echo "  ./.pocock/swarm.sh \"Find bugs in the checkout flow\""
    echo "  ./.pocock/swarm.sh \"Analyze code quality and suggest improvements\""
    exit 1
fi

GOAL="$1"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "=========================================="
echo "Pocock Swarm Analysis"
echo "Goal: $GOAL"
echo "=========================================="
echo ""

# Define swarm perspectives
PERSPECTIVES=(
    "user-experience|You are a UX expert. Focus on user flows, friction points, accessibility, and usability issues."
    "conversion|You are a conversion optimization specialist. Focus on CTAs, trust signals, objection handling, and purchase flow."
    "technical|You are a senior engineer. Focus on code quality, performance, security, and technical debt."
    "competitor|You are a market analyst. Compare to industry best practices and competitor patterns."
    "copy|You are a copywriter. Focus on messaging clarity, emotional resonance, and value proposition."
    "mobile|You are a mobile UX specialist. Focus on responsive design, touch targets, and mobile-first experience."
)

# Launch parallel agents
echo "Launching ${#PERSPECTIVES[@]} parallel analysis agents..."
echo ""

PIDS=()
for perspective in "${PERSPECTIVES[@]}"; do
    NAME=$(echo "$perspective" | cut -d'|' -f1)
    ROLE=$(echo "$perspective" | cut -d'|' -f2)

    PROMPT="$ROLE

## Your Task
Analyze this codebase with the following goal in mind:
\"$GOAL\"

## Instructions
1. Explore the relevant parts of the codebase
2. Identify 2-5 specific, actionable findings
3. For each finding, provide:
   - A clear title (imperative form, e.g., \"Add FAQ section\")
   - Priority: P0 (critical), P1 (high), P2 (medium), P3 (low)
   - Type: bug, feature, or task
   - Description: What's the issue and why it matters
   - Acceptance criteria: How to verify it's fixed (checklist format)

## Output Format
Output your findings as a JSON array:
\`\`\`json
[
  {
    \"title\": \"Add FAQ section to address common objections\",
    \"priority\": \"P2\",
    \"type\": \"feature\",
    \"description\": \"The landing page lacks a FAQ section. Competitors like Bark and Qustodio prominently feature FAQs to address parent concerns before checkout.\",
    \"acceptance\": \"- [ ] FAQ section exists on landing page\\n- [ ] Contains 6-8 relevant questions\\n- [ ] Mobile responsive\"
  }
]
\`\`\`

Only output the JSON array, nothing else."

    # Run Claude in background, save output to temp file
    OUTPUT_FILE="$TMPDIR/${NAME}.json"
    echo "  [$NAME] Starting..."

    (claude --print "$PROMPT" 2>/dev/null | grep -o '\[.*\]' > "$OUTPUT_FILE" || echo "[]" > "$OUTPUT_FILE") &
    PIDS+=($!)
done

# Wait for all agents to complete
echo ""
echo "Waiting for all agents to complete..."
for pid in "${PIDS[@]}"; do
    wait $pid 2>/dev/null || true
done

echo "All agents complete."
echo ""

# Collect and deduplicate findings
echo "Synthesizing findings..."

ALL_FINDINGS="$TMPDIR/all_findings.json"
echo "[" > "$ALL_FINDINGS"

FIRST=true
for perspective in "${PERSPECTIVES[@]}"; do
    NAME=$(echo "$perspective" | cut -d'|' -f1)
    FILE="$TMPDIR/${NAME}.json"

    if [[ -f "$FILE" && -s "$FILE" ]]; then
        CONTENT=$(cat "$FILE" | tr -d '\n' | sed 's/^\[//' | sed 's/\]$//')
        if [[ -n "$CONTENT" && "$CONTENT" != "[]" ]]; then
            if [[ "$FIRST" != "true" ]]; then
                echo "," >> "$ALL_FINDINGS"
            fi
            echo "$CONTENT" >> "$ALL_FINDINGS"
            FIRST=false

            COUNT=$(echo "[$CONTENT]" | jq 'length' 2>/dev/null || echo "?")
            echo "  [$NAME] Found $COUNT issues"
        else
            echo "  [$NAME] No findings"
        fi
    else
        echo "  [$NAME] No output"
    fi
done

echo "]" >> "$ALL_FINDINGS"

# Parse findings and create issues
echo ""
echo "Creating Beads issues..."
echo ""

# Use Claude to deduplicate and create issues
SYNTHESIS_PROMPT="You have collected findings from multiple analysis agents. Your job is to:

1. Deduplicate similar findings (combine if they're about the same thing)
2. Prioritize by impact
3. Create Beads issues for each unique finding

## Raw Findings
$(cat "$ALL_FINDINGS")

## Instructions
For each unique finding, run this command:
\`\`\`bash
bd create --repo . --title \"<title>\" --type <bug|feature|task> --priority <P0|P1|P2|P3> --description \"<description>\" --acceptance \"<acceptance criteria>\"
\`\`\`

Create all issues now. After creating all issues, run \`bd list\` to show what was created."

claude --dangerously-skip-permissions "$SYNTHESIS_PROMPT"

echo ""
echo "=========================================="
echo "Swarm Analysis Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Review created issues: bd list"
echo "  2. Run Pocock loop: ./.pocock/loop.sh 10"
echo ""
