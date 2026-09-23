# NEXUS — Verification & Invariant Architecture (TESTING.md)

## 1. Verification Philosophy: Distrusting the Test Suite

In high-reliability SaaS systems, a green test suite can easily foster false confidence if the tests themselves share the same blind spots as the production code. Prompt 4 establishes a rigorous verification standard:

> **Assume the current test suite may be giving you false confidence.**
> We do not assume a green test means the application is correct, nor that an invariant checker is sound merely because it reports zero errors. The verification system itself is actively red-teamed.

### Core Red-Teaming Principles
1. **Typecheck Tests Strictly**: Tests must compile under the same strict TypeScript compiler (`tsconfig.test.json`) as application code. No phantom enums, out-of-spec fixtures, or `as any` escape hatches that mask real structural breakage.
2. **Attack the Invariant Checker**: The validator (`validateWorkspaceIntegrity`) must be continuously attacked with intentionally mutated, corrupted, or malicious state fixtures. If an invalid state passes undetected, the validator has failed.
3. **Fail-Closed Evaluation**: Automation condition parsers, webhook simulators, and hydration logic fail closed. Nonsense inputs evaluate to false rather than silently executing or throwing uncaught exceptions.
4. **Deterministic Multi-Seed Fuzzing**: Property-based state mutation across pseudo-random seed corpuses (`[428913, 1337, 2026, 99999]`) stress-tests edge-case state compositions (undo, cascading deletes, foreign-key reassignment, monotonic key collision resolution).

---

## 2. Invariant Matrix

The NEXUS domain model enforces invariants across every mutation operation:

| Subsystem | Invariant | Enforcement Mechanism | Red-Team Mutation Test |
| :--- | :--- | :--- | :--- |
| **Workspace Integrity** | Strict Enum Compliance (`TaskStatus`, `TaskPriority`, `ProjectHealth`, `MemberAvailability`) | `validateWorkspaceIntegrity()` runtime audit | `tests/invariants/validatorMutations.test.ts` |
| **Workspace Integrity** | Boundary Ranges: `progress` ∈ [0, 100], `workload` ∈ [0, 100], non-NaN | Strict range assertions in validator and hydration sanitizer | `tests/invariants/validatorMutations.test.ts` |
| **Workspace Integrity** | Relational Foreign Key Integrity (`projectId`, `leadId`, `memberIds`, `assigneeId`) | Validates all foreign references point to existing entities | `tests/invariants/validatorMutations.test.ts` |
| **Workspace Integrity** | Calendar & ISO Date Validity (Reject `2026-02-31`, out-of-range years) | Regex + calendar month day boundary validation (`isValidDateString`) | `tests/invariants/calendarDates.test.ts` |
| **Workspace Integrity** | Global Entity ID Uniqueness | Set collision detection across projects, tasks, docs, automations, notifications, activities | `tests/invariants/validatorMutations.test.ts` |
| **Project Keys** | Monotonic Key Numbering & Collision Avoidance | `generateUniqueProjectKey()` scans maximum suffix; never reuses deleted keys | `tests/invariants/projectKeyCollisions.test.ts` |
| **Task Undo** | Semantic Entity Restoration without Creation Side-Effects | `restoreTaskOp()` preserves exact ID, key, timestamps, comments, subtasks without firing `TASK_CREATED` automations | `tests/invariants/undoSemantics.test.ts` |
| **Task Undo** | Orphan & Key Conflict Safety on Restoration | Reassigns to available project if parent project was deleted; allocates next monotonic key if key was claimed | `tests/invariants/randomizedFuzz.test.ts` (caught via fuzzing!) |
| **Overdue Tasks** | Automation Idempotency via Metadata Ledger | `task.lastOverdueHandledDeadline` tracking; evaluating N times produces 1 notification | `tests/invariants/overdueIdempotency.test.ts` |
| **Automations** | Fail-Closed Condition Evaluation | Rejects nonsense/adversarial predicates (`'Priority approximately purple'`) with `false` | `tests/invariants/automationFailClosed.test.ts` |
| **Automations** | Keyword Disambiguation & Honest Simulation | Distinguishes notifications from priority escalation; explicitly labels webhooks as local simulations | `tests/invariants/automationFailClosed.test.ts` |
| **Persistence** | Runtime Hydration & Storage Sanitization | `hydrateAndValidateWorkspace()` normalizes malformed storage into 100% valid `WorkspaceState` | `tests/invariants/persistedDataRepair.test.ts` |
| **Analytics** | Historical Telemetry vs. Live Metrics Isolation | `buildCompositeTelemetrySeries()` freezes historical past intervals so current task changes never rewrite history | `tests/invariants/analyticsSeparation.test.ts` |
| **Security** | Document Markdown XSS Neutralization | `escapeHtml` + protocol allowlist (`sanitizeUrl`) removes script/iframe/onerror payloads in React DOM | `tests/ui/componentSecurity.test.tsx` |
| **Accessibility** | Modal Background Inertness & Focus Trapping | `role="dialog"`, `aria-modal="true"`, backdrop `aria-hidden="true"`, Tab trapping, Escape dismiss | `tests/ui/modalAccessibility.test.tsx` |
| **Safety** | Bulk Delete Affirmative Confirmation | `ConfirmationModal` required before destructive bulk task deletion | `src/components/projects/TaskListView.tsx` |
| **Storage Durability** | Monotonic Revision & Epoch Guard (`epoch`, `revision`) | Transaction-level envelope guards reject stale / out-of-order writes and defeat reset resurrection | `tests/concurrency/outOfOrderWrites.test.ts` |
| **Hydration Ordering** | Mount Mutation Race Protection (`hasLocalMutatedSinceMountRef`) | Async storage hydration cannot overwrite synchronous user edits performed before hydration completes | `tests/concurrency/hydrationRaces.test.ts` |
| **Multi-Tab Sync** | 3-Way Concurrent Field-Level Merge (`mergeTaskFields`) | Disjoint field mutations (e.g. title vs priority) merge cleanly without data loss; conflicts detected honestly | `tests/concurrency/multiTabSync.test.ts` |
| **Automation Isolation** | Remote Mutation Propagation Guard (`remote: true`) | Prevents cascading automation loops, duplicate webhooks, or notification storms across tabs | `tests/concurrency/multiTabSync.test.ts` |
| **Storage Failover** | Dual-Tier IndexedDB to LocalStorage Fallback & Retry | Recovers from QuotaExceededError or IDB failures with exponential backoff and honest UI persistence status | `tests/concurrency/storageFailures.test.ts` |
| **Adversarial Resiliency** | Multi-Tab Burst Stress with Reset Propagation | 2 concurrent tabs with burst mutations, storage flushes, reset propagation, and zero integrity violations | `tests/concurrency/finalAdversarialScenario.test.ts` |

---

## 3. Test Suite Taxonomy

The test suite is organized into 8 specialized layers across 34 test suites (126 total tests):

```
tests/
├── concurrency/
│   ├── finalAdversarialScenario.test.ts # Full Section 57 adversarial scenario with 2 concurrent tabs
│   ├── hydrationRaces.test.ts           # Protection against stale async storage overwriting mount mutations
│   ├── multiTabSync.test.ts             # 3-way field merge, conflict detection, automation isolation
│   ├── outOfOrderWrites.test.ts         # Monotonic revision guard, write coalescing, reset resurrection
│   └── storageFailures.test.ts          # LocalStorage fallback, retry backoff, >5MB payload roundtrip
├── invariants/
│   ├── analyticsSeparation.test.ts      # Verifies historical telemetry remains frozen
│   ├── automationFailClosed.test.ts     # Fail-closed condition parsing & keyword collision safety
│   ├── automationInvariants.test.ts     # Triggers, conditions, action execution & loop guards
│   ├── calendarDates.test.ts            # Calendar boundary dates (leap years, invalid days)
│   ├── documentSecurity.test.ts         # Pure-function XSS string sanitization
│   ├── eventOrdering.test.ts            # Causality, activity timestamps & chronological order
│   ├── immutabilityIdempotency.test.ts  # State immutability & duplicate action idempotency
│   ├── loopProtection.test.ts           # Max recursion depth guard in automation chains
│   ├── memberInvariants.test.ts         # Workload capacity calculations & availability
│   ├── overdueIdempotency.test.ts       # Repeated overdue evaluation idempotency
│   ├── persistenceRoundtrip.test.ts     # Serialization roundtrip preservation
│   ├── persistedDataRepair.test.ts      # Corrupted/stale localStorage repair & normalization
│   ├── projectInvariants.test.ts        # Progress calculations, health transitions & cascading deletes
│   ├── projectKeyCollisions.test.ts     # Monotonic project key assignment & duplicate resolution
│   ├── randomizedFuzz.test.ts           # Deterministic multi-seed property-based fuzzing (600+ mutations)
│   ├── snapshotSafety.test.ts           # Undo/redo stack integrity and depth bounds
│   ├── taskInvariants.test.ts           # Task state transitions, progress updates & key formats
│   ├── timeBasedAutomations.test.ts     # Time-shifted deadline expiry & overdue status triggers
│   ├── undoSemantics.test.ts            # Entity identity preservation on undo without side-effects
│   └── validatorMutations.test.ts       # 14 adversarial mutations testing validator detection
├── performance/
│   ├── atomicity.test.ts                # Transactional atomicity across tasks, progress, workloads, activities
│   ├── burstMutations.test.ts           # 100 rapid same-tick mutations without lost updates
│   ├── metricsEquivalence.test.ts       # Proves fast metrics match brute-force calculations bit-for-bit
│   ├── perfHarness.test.ts              # Automated benchmark harness across Small, Medium, Large tiers
│   ├── persistenceScale.test.ts         # IndexedDB round-trip, write coalescing, 5MB+ payload handling
│   └── stressGenerator.test.ts          # Generates 500 prj / 10k tasks / 200 members passing integrity
└── ui/
    ├── componentSecurity.test.tsx       # React DOM rendering of adversarial markdown & modal attributes
    ├── kanbanTouchKeyboard.test.tsx     # Keyboard accessibility & touch progress controls
    └── modalAccessibility.test.tsx      # WAI-ARIA modal dialog focus trapping & backdrop isolation
```

---

## 4. Running Verification Locally and in CI

### Unified Quality Gate
A single command runs all checks in strict sequence:
```bash
npm run verify
```
This executes:
1. `npm run typecheck`: Runs `tsc -b` on production code and `tsc --noEmit -p tsconfig.test.json` on the test suite.
2. `npm run lint`: Runs `oxlint` ensuring 0 lint errors across the codebase.
3. `npm run test:run`: Runs all 29 Vitest suites (110 tests) across invariants, fuzzing, scale, performance, and UI.
4. `npm run build`: Compiles production Vite bundles with zero errors.

### Individual Verification Commands
```bash
# Run the automated performance benchmark harness across Small, Medium, and Large
npm run perf

# Typecheck production code and test suite strictly
npm run typecheck

# Run linter
npm run lint

# Run Vitest test runner once
npm run test:run

# Run Vitest in interactive watch mode
npm run test

# Production build
npm run build
```

### Continuous Integration (GitHub Actions)
The `.github/workflows/verify.yml` workflow triggers on every push and pull request to `main`, running the unified quality gate in an isolated Ubuntu environment.

---

## 5. Adding New Invariants and Adversarial Tests

When introducing new domain models or operations:
1. **Define the Invariant in Code**: Add the integrity rule into `src/domain/workspaceIntegrity.ts` with structured reporting (`ValidationIssue`).
2. **Create an Adversarial Red-Team Test**: In `tests/invariants/validatorMutations.test.ts`, deliberately mutate state to violate the invariant and assert that `validateWorkspaceIntegrity()` catches it with severity `'error'`.
3. **Add Property Mutation to Fuzzing**: Incorporate the new state transition into `tests/invariants/randomizedFuzz.test.ts` to ensure it holds across all pseudo-random seeds.
4. **Verify Strict Compilation**: Run `npm run verify` to guarantee zero type errors and clean production builds.
