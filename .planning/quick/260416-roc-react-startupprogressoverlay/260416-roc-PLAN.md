---
phase: quick
plan: 260416-roc
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/App.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - StartupProgressOverlay React component is deleted
    - useStartupProgress hook is deleted
    - App.tsx no longer imports or uses these removed modules
---

<objective>
Remove the React StartupProgressOverlay component and useStartupProgress hook now that native Tauri setupoverlay handles startup progress.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Remove StartupProgressOverlay and useStartupProgress from App.tsx</name>
  <files>src/renderer/App.tsx</files>
  <action>
Remove four things from App.tsx:
1. Line 9: Remove `import StartupProgressOverlay from '@/components/StartupProgressOverlay';`
2. Line 10: Remove `import { useStartupProgress } from '@/hooks/useStartupProgress';`
3. Line 270: Remove `const startupProgress = useStartupProgress();`
4. Lines 1894-1900: Remove the entire `<StartupProgressOverlay>` JSX block:
```jsx
        <StartupProgressOverlay
          visible={startupProgress.isVisible}
          onComplete={() => {
            // Startup complete - hook has already set isVisible=false
            console.log('[App] Startup progress complete');
          }}
        />
```
</action>
  <verify>grep -n "StartupProgressOverlay\|useStartupProgress" src/renderer/App.tsx returns no matches</verify>
  <done>App.tsx no longer imports or uses StartupProgressOverlay or useStartupProgress</done>
</task>

<task type="auto">
  <name>Task 2: Delete StartupProgressOverlay.tsx</name>
  <files>src/renderer/components/StartupProgressOverlay.tsx</files>
  <action>Delete the file src/renderer/components/StartupProgressOverlay.tsx</action>
  <verify>test ! -f src/renderer/components/StartupProgressOverlay.tsx && echo "deleted"</verify>
  <done>StartupProgressOverlay.tsx no longer exists</done>
</task>

<task type="auto">
  <name>Task 3: Delete useStartupProgress.ts</name>
  <files>src/renderer/hooks/useStartupProgress.ts</files>
  <action>Delete the file src/renderer/hooks/useStartupProgress.ts</action>
  <verify>test ! -f src/renderer/hooks/useStartupProgress.ts && echo "deleted"</verify>
  <done>useStartupProgress.ts no longer exists</done>
</task>

</tasks>

<verification>
grep -rn "StartupProgressOverlay\|useStartupProgress" src/renderer/ --include="*.ts" --include="*.tsx" returns no matches
</verification>

<success_criteria>
- StartupProgressOverlay.tsx deleted
- useStartupProgress.ts deleted
- App.tsx has no reference to either
- npm run typecheck passes
</success_criteria>

<output>
After completion, create `.planning/quick/260416-roc-react-startupprogressoverlay/260416-roc-SUMMARY.md`
</output>
