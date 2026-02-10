# Entropy Loop

Fight software entropy. Clean up the codebase.

## Process

1. Scan for code smells:
   - Unused exports
   - Dead code
   - Inconsistent patterns
   - Duplicate logic
   - TODO/FIXME comments
   - Type `any` usage
   - Console.log statements

2. Fix ONE issue per iteration
   - Keep changes small and focused
   - Don't refactor everything at once

3. Run feedback loops:

   ```bash
   npm run test && npm run build && npm run lint
   ```

4. Document what you changed in progress.md

5. Commit with message like:

   ```
   chore: remove unused export from utils.ts
   ```

6. Repeat until codebase is clean

If no more code smells found, output:
<promise>COMPLETE</promise>
