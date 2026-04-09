# React Componentization Pitfalls

**Project:** nova-agents Settings Page Refactoring
**Researched:** 2026-04-09
**Overall Confidence:** HIGH

## Executive Summary

React componentization refactoring introduces specific risks that can silently break functionality, degrade performance, and increase maintenance burden. The most critical pitfalls are: **over-extraction creating unneeded complexity**, **breaking useEffect dependencies during extraction**, **unstable callback references causing infinite loops**, and **unnecessary re-renders from improper Context usage**. This research identifies 15 specific pitfalls with detection methods and prevention strategies tailored to large-scale React component refactoring.

## Key Findings

**Most Critical:** Breaking useEffect dependencies when extracting components (Pitfall #3)
**Most Common:** Over-extraction into tiny components without clear purpose (Pitfall #1)
**Most Insidious:** Unstable callback references causing re-render cascades (Pitfall #7)
**Hardest to Detect:** Silent functionality regressions from incomplete state migration (Pitfall #4)

---

## Critical Pitfalls (High Impact, High Probability)

### Pitfall 1: Over-Extraction into Tiny Components

**What goes wrong:**
Splitting components arbitrarily into pieces that are too small, creating unnecessary complexity without genuine reusability benefits. This is recognized as an anti-pattern when component splits don't serve clear purposes like reusability, maintainability, or performance optimization.

**Why it happens:**
- Misinterpreting "components should be small" as "smaller is always better"
- Premature optimization for reusability that never materializes
- Treating component extraction as an end rather than a means

**Consequences:**
- **Increased cognitive load**: More files to navigate, harder to understand data flow
- **Prop drilling hell**: Tiny components require passing props through multiple layers
- **Maintenance burden**: Simple changes require touching multiple files
- **Performance degradation**: More component boundaries means more reconciliation work

**Detection:**
- Components under 50 lines that aren't reused elsewhere
- Single-use components with 1-2 props that just render HTML
- Files named like `XHeader`, `XTitle`, `XLabel` (atomic splitting)
- Component directory deeper than 3 levels for a single feature

**Prevention:**
- **3 questions rule before extracting**:
  1. Will this be reused in 2+ places?
  2. Does it have complex state/logic worth isolating?
  3. Does it make the code easier to understand?
- **Keep presentation together**: Don't split header/content/title if they're always used together
- **Co-locate related components**: Keep feature components in the same directory
- **Minimum size threshold**: Avoid extracting components under 50-80 lines unless reusable

**Phase to address:** Phase 1 (Architecture) — Establish component extraction guidelines

**Sources:**
- [Medium: Five Pitfalls of React Component Design](https://medium.com/geckoboard-under-the-hood/five-pitfalls-of-react-component-design-6d946cf4313a) (HIGH confidence)
- [Stack Overflow: React - Overdoing it on 'small components'](https://stackoverflow.com/questions/39391195/what-are-the-disadvantages-of-using-one-big-react-component) (MEDIUM confidence)

---

### Pitfall 2: Prop Drilling vs Context Misapplication

**What goes wrong:**
Either drilling props through 4+ levels creating tight coupling, OR using Context for simple 2-3 level prop passing creating unnecessary complexity.

**Why it happens:**
- Context API overuse: "Context eliminates prop drilling, so use it everywhere"
- Prop drilling inertia: Unwillingness to introduce Context for genuine cross-tree needs
- Missing decision framework for when to use which

**Consequences:**
- **Prop drilling pain**: Intermediate components coupled to data they don't use ( ProvidersSection → ProviderCard → ApiKeyInput → VerifyButton)
- **Context re-render cascades**: All consumers re-render on any Context value change
- **Implicit dependencies**: With Context, hard to trace where data comes from
- **Type safety erosion**: More `any` types to satisfy complex Context consumers

**Detection:**
- Props passed through 3+ components that don't use them (prop drilling)
- Single-consumer Context (only one component uses the data)
- Context value changes frequently (every render or state update)
- Components with 10+ props from parent chains

**Prevention:**
- **Decision framework**:
  - 2-3 levels → Prop drilling
  - 4+ levels OR data used by 3+ components → Context
  - Global app state (theme, auth, config) → Context
- **Split Context by concern**: `ThemeContext`, `UserContext`, `ConfigContext` not `AppContext`
- **Memoize Context values**: Use `useMemo` for Provider values (see project's React Stability Rule #1)
- **Optimize Context consumers**: Use `React.memo` for expensive components consuming frequently-changing Context

**Phase to address:** Phase 1 (Architecture) — Design Context strategy for Settings

**Sources:**
- Project's React Stability Rules (Rule #1: Context Provider 必须 useMemo)
- [React.dev: Thinking in React](https://react.dev/learn/thinking-in-react) (HIGH confidence)

---

### Pitfall 3: Breaking useEffect Dependencies During Extraction

**What goes wrong:**
When extracting logic into custom hooks or child components, useEffect dependency arrays become incomplete or include unstable dependencies, causing infinite loops, stale closures, or silent failures.

**Why it happens:**
- Moving state/effects without updating all related dependency arrays
- Extracting callbacks without `useCallback` wrapping
- Prop drilling functions that change reference every render
- Forgetting that extracted components have separate effect lifecycles

**Consequences:**
- **Infinite loops**: Effect runs → updates state → effect runs again
- **Stale closures**: Effect captures old values, uses outdated state
- **Silent failures**: Effect never runs, API calls don't fire
- **Memory leaks**: Cleanup functions never called or called too late

**Detection:**
- Console warnings: "React Hook useEffect has missing dependencies"
- Effects that run every render (add console.log to detect)
- State updates that don't trigger expected effects
- Memory usage growing over time (leaked intervals/timeouts)

**Prevention:**
- **Exhaustive deps rule**: Always include all dependencies from effect scope
- **Stabilize callbacks with useCallback**: All callbacks in effects must have stable references
- **Ref pattern for unstable deps**: Use `useRef` for values that change but shouldn't trigger effects (see project's Rule #3: 跨组件回调稳定化)
- **Test effect execution**: Add `console.log('[EffectName] running')` during development
- **Use ESLint react-hooks/exhaustive-deps**: Never disable this rule!

**Example from project's stability rules:**
```typescript
// ✅ Correct: Ref synchronization for unstable dependencies
const onChangeRef = useRef(onChange);
onChangeRef.current = onChange;  // Update every render

useEffect(() => {
    onChangeRef.current?.(value);  // Use ref, not onChange directly
}, [value]);  // Don't depend on onChange
```

**Phase to address:** Phase 2-5 (All extraction phases) — Critical for every useEffect migration

**Sources:**
- Project's React Stability Rules (Rules #2, #3, #5)
- [LogRocket: How to refactor React components to use Hooks](https://blog.logrocket.com/refactor-react-components-hooks/) (HIGH confidence)
- [Medium: Refactoring with React Hooks - Real World examples](https://medium.com/@MartinBing/refactoring-with-react-hooks-606140d6daa6) (MEDIUM confidence)

---

### Pitfall 4: Silent Functionality Regressions

**What goes wrong:**
During refactoring, features silently break because state is split incorrectly, event handlers are disconnected, or async operations aren't properly migrated. No errors thrown, but functionality lost.

**Why it happens:**
- Extracting state but forgetting to wire up update handlers
- Moving async operations to hooks but not handling loading/error states
- Breaking callback chains during component extraction
- Missing event handler connections in new component boundaries

**Consequences:**
- **Features stop working**: Buttons don't respond, forms don't submit
- **Data inconsistencies**: State updates lost, stale data displayed
- **User data corruption**: Save operations partially complete
- **Hard-to-diagnose bugs**: No error messages, just wrong behavior

**Detection:**
- **Regression testing checklist**: Before/after behavior comparison
- **Manual testing**: Click through every Settings section after each phase
- **Console monitoring**: Watch for uncaught promise rejections
- **State inspection**: React DevTools to verify state updates flow correctly

**Prevention:**
- **Test-first refactoring**: Write tests capturing current behavior before changes (see [Common Sense Refactoring](https://alexkondov.com/refactoring-a-messy-react-component/))
- **Incremental migration**: One section at a time, verify after each (project's Phase 1-6)
- **Feature audit checklist**: For each Settings section, document expected behaviors:
  - Provider API key save → should update config, clear verification status
  - MCP server enable → should spawn server, update enabled list
  - Custom provider add → should append to provider list, reset form
- **Visual regression testing**: Screenshots before/after to catch UI changes
- **Parallel development**: Keep old code working until new code verified

**Phase to address:** All phases — Each phase requires regression testing before completion

**Sources:**
- [Alex Kondov: Common Sense Refactoring](https://alexkondov.com/refactoring-a-messy-react-component/) (HIGH confidence)
- [ITNext: How to safely refactor old code](https://itnext.io/how-to-safely-refactor-old-code-part-1-a1a853263fec) (HIGH confidence)
- [StackOverflow: How do I know I'm not breaking anything during refactoring?](https://stackoverflow.com/questions/26303380/how-do-i-know-that-im-not-breaking-anything-during-refactoring) (MEDIUM confidence)

---

## Moderate Pitfalls (Medium Impact)

### Pitfall 5: State Location Confusion (Lifting State Too Early)

**What goes wrong:**
Hoisting state to a higher level than necessary, causing unnecessary re-renders and tight coupling. This is a common mistake in componentization.

**Why it happens:**
- "Props are bad, let's lift everything to Context"
- Misunderstanding which state truly needs to be shared
- Lifting state "just in case" it's needed elsewhere

**Consequences:**
- **Performance degradation**: Unrelated components re-render when state changes
- **Tight coupling**: Components become dependent on shared state unnecessarily
- **Debugging difficulty**: Harder to trace which component owns which state

**Detection:**
- State lifted to parent but only used by one child component
- Components re-rendering when unrelated state changes (use React DevTools Profiler)
- Props passing state through multiple levels without intermediate usage

**Prevention:**
- **Keep state local as long as possible**: Only lift when 2+ components need it
- **Colocate state**: State should live as close to where it's used as possible
- **Project's state location strategy** (from migration plan):
  - `activeSection` → Settings (parent) — needed by Layout + Sidebar
  - `mcpServers` → McpSection (local) — only MCP section uses it
  - `subscriptionStatus` → ProvidersSection (local) — only providers need it
- **Prefer props over Context**: For 2-3 component levels, props are simpler and more explicit

**Phase to address:** Phase 1 (Architecture) — Design state ownership map

**Sources:**
- [Web Search Results: React state management mistakes](https://www.google.com/search?q=React+state+management+mistakes+where+state+lives+componentization) (MEDIUM confidence)
- [Project's Migration Plan: Section 6.1](https://github.com/your-repo/docs/settings-componentization.md#61-state-location-strategy)

---

### Pitfall 6: Breaking TypeScript Type Definitions

**What goes wrong:**
Props interfaces become incorrect during refactoring, using `any` types, optional types (`?`) where required types are needed, or circular dependencies that break type checking.

**Why it happens:**
- Rushing to extract components without fully defining types
- Using `any` to "make it work" temporarily
- Complex unions/polymorphic props that are hard to type correctly
- Not updating all call sites when interface changes

**Consequences:**
- **Loss of type safety**: Runtime errors that should be caught at compile time
- **IDE assistance degraded**: Autocomplete stops working
- **Confusion**: Unclear what props component actually needs
- **Maintenance burden**: Fear of changing types because might break something

**Detection:**
- TypeScript `any` usage (search for `: any` in Props interfaces)
- `@ts-ignore` or `@ts-expect-error` comments
- Missing required props in TypeScript errors
- Circular dependency warnings

**Prevention:**
- **Strict TypeScript mode**: Enable `strict: true`, `noImplicitAny`, `strictNullChecks`
- **Define Props interfaces first**: Before extracting, write clear interface
- **Export Props interfaces**: For shared components (ProviderCard, McpServerCard), export types
- **Use discriminated unions for polymorphic props**: Instead of optional fields
- **Project constraint**: "TypeScript 无 any 类型" is in QA-02 acceptance criteria

**Phase to address:** All phases — Type checking required for every new component

**Sources:**
- [Medium: Best Practices for Using TypeScript with React](https://medium.com/@mkare/best-practices-for-using-typescript-with-react-bad13d851143) (MEDIUM confidence)
- [Dev.to: TypeScript Types or Interfaces for React component props](https://dev.to/reyronald/typescript-types-or-interfaces-for-react-component-props-1408) (MEDIUM confidence)

---

### Pitfall 7: Unstable Callback References Causing Re-render Cascades

**What goes wrong:**
When parent components pass inline functions to children, or create new callbacks on every render, child components that should be memoized re-render unnecessarily, causing performance degradation.

**Why it happens:**
- Forgetting to wrap callbacks in `useCallback`
- `useCallback` dependency array includes unstable values
- Not using project's "ref synchronization" pattern for complex callbacks

**Consequences:**
- **Performance regression**: Expensive components re-render on every parent update
- **Cascading re-renders**: One state update triggers entire subtree to re-render
- **Battery drain**: Mobile devices suffer from constant rendering

**Detection:**
- React DevTools Profiler: Highlighted components re-rendering when props shouldn't change
- `console.log` in component render: Logging showing frequent renders
- Performance profiling: Long script execution times after state changes

**Prevention:**
- **All callbacks passed to children must use `useCallback`**: With minimal dependencies
- **Ref synchronization pattern** (project's Stability Rule #3): For callbacks that need latest state but shouldn't change
  ```typescript
  const stateRef = useRef(state);
  stateRef.current = state;

  const stableCallback = useCallback(() => {
      const item = stateRef.current.find(...);
  }, []);  // Empty deps = stable reference
  ```
- **Memo + custom comparator** (project's Stability Rule #5): For expensive list items
- **Split Context**: Separate data and actions Contexts (project's Stability Rule: Dual Context)

**Phase to address:** Phase 3-5 (Shared components + Section extraction) — Critical for performance

**Sources:**
- Project's React Stability Rules (Rule #3, #5, 扩展模式 A)
- [Josh Comeau: Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/) (HIGH confidence)
- [Medium: I Cut React Component Re-Renders by 40%](https://javascript.plainenglish.io/i-cut-react-component-re-renders-by-40-heres-the-surprising-fixes-that-worked-bf1e349863b0) (MEDIUM confidence)

---

### Pitfall 8: Context Value Instability

**What goes wrong:**
Context Providers create new object/function references on every render, causing all consumers to re-render unnecessarily. This directly violates project's React Stability Rule #1.

**Why it happens:**
- Using inline object literals in Provider value: `value={{ state, setState }}`
- Creating new functions in Provider: `value={{ handle: () => { ... } }}`
- Forgetting `useMemo` for Context value

**Consequences:**
- **Massive re-render cascades**: Every Context consumer re-renders on any Provider update
- **Performance degradation**: Especially problematic for large Context consumer trees
- **Battery drain**: Constant re-renders on mobile devices

**Detection:**
- React DevTools Profiler: All consumers highlighting on every render
- Many components consuming same Context all re-rendering simultaneously
- Performance profiling shows Component.render as hotspot

**Prevention:**
- **MUST use useMemo for Context values** (project's Stability Rule #1):
  ```typescript
  const contextValue = useMemo(() => ({
      showToast, success, error, warning, info
  }), [showToast, success, error, warning, info]);
  ```
- **Stabilize all functions in value**: Use `useCallback` for all callbacks
- **Split Context by change frequency**: Separate rarely-changing actions from frequently-changing data (Dual Context pattern)
- **Use React.memo for expensive consumers**: Combine with stable Context values

**Phase to address:** Phase 1 (Architecture) — Design Context structure with stability

**Sources:**
- Project's React Stability Rules (Rule #1: Context Provider 必须 useMemo)
- [Dev.to: React.memo + useCallback: How to Avoid Unnecessary Re-renders](https://dev.to/gunnarhalen/reactmemo-usecallback-how-to-avoid-unnecessary-re-renders-3pn6) (HIGH confidence)

---

## Minor Pitfalls (Low Impact)

### Pitfall 9: Component Nesting Too Deep

**What goes wrong:**
Creating deeply nested component hierarchies (6+ levels) making it hard to understand data flow and pass props.

**Why it happens:**
- Over-extraction (Pitfall #1) leading to deep trees
- Not using composition to flatten structures
- Component boundaries drawn at wrong granularity

**Consequences:**
- **Slower rendering**: Each nesting level adds processing overhead
- **Higher memory usage**: More component instances in tree
- **Debugging difficulty**: Hard to trace which component renders what

**Detection:**
- React DevTools Component tree: 6+ levels of nesting for single feature
- Props passing through 4+ intermediate components that don't use them

**Prevention:**
- **Prefer composition over nesting**: Use `children` prop to flatten
- **Limit nesting depth**: Maximum 4-5 levels for any component tree
- **Use compound components**: For tightly related components (e.g., Tabs, Tab, TabPanel)

**Phase to address:** Phase 1 (Architecture) — Review component hierarchy depth

**Sources:**
- [Hashnode: The Trouble with Unnecessary Nesting of React Components](https://anasouardini.hashnode.dev/the-trouble-with-unnecessary-nesting-of-react-components) (MEDIUM confidence)

---

### Pitfall 10: Missing Component Boundaries for List Items

**What goes wrong:**
Rendering lists without proper component boundaries, causing entire list to re-render when single item changes.

**Why it happens:**
- Inline rendering in `.map()`: `{items.map(item => <div key={item.id}>{item.name}</div>)}`
- Not extracting list items into separate components
- Missing `key` prop or using array index as key

**Consequences:**
- **Performance degradation**: One item update re-renders entire list
- **Lost input focus**: Re-rendering resets form inputs in list items

**Detection:**
- React DevTools Profiler: Entire list highlights when single item changes
- Input focus loss when typing in list items

**Prevention:**
- **Extract list items into components**: `items.map(item => <Item key={item.id} data={item} />)`
- **Use stable keys**: Unique IDs, never array indices
- **Memo list items**: Apply `React.memo` to item components
- **Project's Stability Rule #5**: Memo + ref pattern for expensive list rendering

**Phase to address:** Phase 3 (ProviderCard, McpServerCard extraction) — Critical for lists

**Sources:**
- Project's React Stability Rules (Rule #5: memo + ref 稳定化模式)

---

### Pitfall 11: Forgetting Cleanup Functions

**What goes wrong:**
useEffect without cleanup, or cleanup that doesn't properly unsubscribe/intervals/timers, causing memory leaks and "zombie" operations.

**Why it happens:**
- Focusing on setup logic, forgetting teardown
- Moving effects without moving cleanup functions
- Not testing component unmount behavior

**Consequences:**
- **Memory leaks**: Intervals, event listeners, subscriptions persist after unmount
- **"Zombie" operations**: Async operations complete after component unmounted
- **State updates on unmounted components**: React warnings in console

**Detection:**
- React warnings: "Can't perform a React state update on an unmounted component"
- Memory usage growing over time in DevTools
- Console errors from callbacks executing after unmount

**Prevention:**
- **All effects with side effects need cleanup**: `useEffect(() => { ... return cleanup; }, [])`
- **Project's Stability Rule #4**: 定时器必须清理
- **isMountedRef pattern** (project's 扩展模式 B): Check mounted state before async updates
  ```typescript
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  fetchData().then(result => {
      if (!isMountedRef.current) return;
      setState(result);
  });
  ```

**Phase to address:** All phases with useEffect migrations

**Sources:**
- Project's React Stability Rules (Rule #4, 扩展模式 B)

---

### Pitfall 12: Hook Rules Violations

**What goes wrong:**
Calling hooks conditionally, inside loops, or inside nested functions, breaking React's hook order guarantees.

**Why it happens:**
- Not understanding hook order requirements
- Extracting logic into functions that are then called conditionally
- Converting class components without properly restructuring

**Consequences:**
- **Runtime errors**: "React has detected a change in the order of Hooks"
- **Silent bugs**: Hooks accessing wrong state/closures
- **Crashes**: Application completely breaks

**Detection:**
- ESLint rule: `react-hooks/rules-of-hooks` (MUST be enabled)
- Console errors about hook order
- Hooks returning `undefined` or wrong values

**Prevention:**
- **Two cardinal rules**:
  1. Only call hooks at top level (not inside loops, conditions, nested functions)
  2. Only call hooks from React functions (not regular JS functions)
- **Enable ESLint react-hooks plugin**: Catch violations at dev time
- **Extract custom hooks**: For reusable logic, create proper hooks (top-level functions)

**Phase to address:** All phases — ESLint must pass before committing

**Sources:**
- [React.dev: Rules of Hooks](https://react.dev/reference/rules) (HIGH confidence)
- [Medium: Refactoring with React Hooks - Real World examples](https://medium.com/@MartinBing/refactoring-with-react-hooks-606140d6daa6) (MEDIUM confidence)

---

## Phase-Specific Warnings

### Phase 1 (Layout Structure)

**Pitfalls to watch:**
- **Pitfall #9**: Component nesting too deep in Layout/Sidebar structure
- **Pitfall #2**: Overusing Context for activeSection state (props suffice for 2 levels)

**Mitigation:**
- Keep Layout shallow: Layout → Sidebar + ContentArea
- Use props for activeSection, not Context (only 2 components need it)

---

### Phase 2 (Shared Components)

**Pitfalls to watch:**
- **Pitfall #1**: Over-extracting tiny components (e.g., extracting InputLabel as separate component)
- **Pitfall #3**: Breaking useEffect dependencies in useProviderVerify hook
- **Pitfall #7**: Unstable callbacks in ProviderCard.onVerify, McpServerCard.onToggle

**Mitigation:**
- Only extract truly reusable components (ProviderCard used by N providers)
- Wrap all callbacks in useCallback with proper deps
- Test hook behavior thoroughly before use

---

### Phase 3 (ProvidersSection)

**Pitfalls to watch:**
- **Pitfall #3**: useEffect breaking when extracting provider verification logic
- **Pitfall #4**: Silent regressions in provider add/edit/delete workflows
- **Pitfall #7**: Re-render cascades from ProviderCard using unstable callbacks

**Mitigation:**
- Complete feature audit before extraction (document all provider workflows)
- Test every provider operation after extraction
- Use project's Stability Rule #5 (memo + ref) for provider list rendering

---

### Phase 4 (McpSection)

**Pitfalls to watch:**
- **Pitfall #3**: Breaking MCP server enable/disable useEffect chains
- **Pitfall #4**: OAuth flow breaking during dialog extraction
- **Pitfall #6**: Complex config panel props (Playwright, EdgeTTS, GeminiImage)

**Mitigation:**
- Keep OAuth logic in one component until fully understood
- Define strict Props interfaces for config panels before extraction
- Test MCP enable/disable flow with real servers

---

### Phase 5 (Cleanup)

**Pitfalls to watch:**
- **Pitfall #11**: Lingering cleanup functions not properly migrated
- **Pitfall #6**: Lingering `any` types from rushed extraction

**Mitigation:**
- Comprehensive ESLint pass: `npm run lint` must have zero warnings
- TypeScript strict mode check: `npm run typecheck` must pass
- Manual audit of all useEffect callsites

---

## Prevention Checklist

### Before Extracting Any Component

- [ ] Document why extraction is needed (reusability? complexity? performance?)
- [ ] Verify component will be >50 lines (avoid over-extraction)
- [ ] List all state/effects that will move with component
- [ ] Write test capturing current behavior

### After Extracting Component

- [ ] Props interface defined and exported
- [ ] All callbacks use `useCallback` with minimal deps
- [ ] useEffect dependencies are exhaustive (ESLint passes)
- [ ] Component works standalone (test in isolation)
- [ ] No TypeScript `any` types
- [ ] Re-render performance tested (React DevTools Profiler)

### Before Committing Phase

- [ ] All features from original Settings work identically
- [ ] ESLint zero warnings
- [ ] TypeScript typecheck passes
- [ ] Manual regression testing complete
- [ ] No new `console.error` or React warnings
- [ ] Memory stable (no growing leaks in DevTools)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Over-extraction risks | HIGH | Multiple authoritative sources confirm anti-pattern |
| useEffect dependency breaking | HIGH | Project's stability rules + external sources align |
| Performance/re-render issues | HIGH | Well-documented React performance patterns |
| Prop drilling vs Context | HIGH | Established decision frameworks exist |
| Regression prevention | HIGH | Standard refactoring practices |
| TypeScript pitfalls | MEDIUM | General best practices, project-specific nuance |

---

## Gaps to Address

- **Visual regression testing**: Need to select tool (Percy? Chromatic?) and integrate into workflow
- **Performance benchmarking**: Baseline metrics needed before refactoring (render times, re-render counts)
- **Hook testing**: How to unit test complex hooks like `useProviderVerify`?

---

## Sources

### High Confidence (Official docs/authoritative sources)
- [Project's React Stability Rules](D:\Projects\Tauri\nova-agents\specs\tech_docs\react_stability_rules.md) — Directly applicable to nova-agents
- [React.dev: Thinking in React](https://react.dev/learn/thinking-in-react)
- [React.dev: Rules of Hooks](https://react.dev/reference/rules)
- [Josh Comeau: Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/)

### Medium Confidence (Reputable blogs, community consensus)
- [Alex Kondov: Common Sense Refactoring](https://alexkondov.com/refactoring-a-messy-react-component/)
- [ITNext: How to safely refactor old code](https://itnext.io/how-to-safely-refactor-old-code-part-1-a1a853263fec)
- [LogRocket: How to refactor React components to use Hooks](https://blog.logrocket.com/refactor-react-components-hooks/)
- [Dev.to: React.memo + useCallback](https://dev.to/gunnarhalen/reactmemo-usecallback-how-to-avoid-unnecessary-re-renders-3pn6)
- [Medium: I Cut React Component Re-Renders by 40%](https://javascript.plainenglish.io/i-cut-react-component-re-renders-by-40-heres-the-surprising-fixes-that-worked-bf1e349863b0)
- [Medium: Five Pitfalls of React Component Design](https://medium.com/geckoboard-under-the-hood/five-pitfalls-of-react-component-design-6d946cf4313a)

### Web Search Results (Lower confidence, corroboration needed)
- Various StackOverflow discussions on component size and prop drilling
- Community blog posts on TypeScript best practices

---

*Last updated: 2026-04-09*
*Next review: After Phase 1 completion, validate prevention strategies*
