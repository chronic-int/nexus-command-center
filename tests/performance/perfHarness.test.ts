import { describe, it, expect } from 'vitest';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  deleteProjectCascadeOp,
} from '../../src/domain/workspaceDomain';
import { calculateProjectProgress, calculateMemberWorkload } from '../../src/utils/metrics';
import { processWorkspaceAutomation } from '../../src/utils/automationEngine';
import { buildCompositeTelemetrySeries } from '../../src/data/historicalTelemetry';

interface BenchmarkResult {
  operation: string;
  small: string; // 6 prj / 40 tasks
  medium: string; // 100 prj / 2,000 tasks
  large: string; // 500 prj / 10,000 tasks
}

describe('NEXUS Performance & Scale Benchmark Harness', () => {
  it('measures representative operations across Small, Medium, and Large workspaces', () => {
    const results: BenchmarkResult[] = [];

    function measure(fn: () => void, iterations: number = 1): number {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        fn();
      }
      return (performance.now() - start) / iterations;
    }

    // 1. Generate Workspaces
    const tSmallGen = measure(() => createLargeWorkspace({ projects: 6, tasks: 40, members: 8, notifications: 20, activities: 50, documents: 10, automations: 10 }));
    const wsSmall = createLargeWorkspace({ seed: 101, projects: 6, tasks: 40, members: 8, notifications: 20, activities: 50, documents: 10, automations: 10 });

    const tMedGen = measure(() => createLargeWorkspace({ projects: 100, tasks: 2000, members: 50, notifications: 400, activities: 1000, documents: 100, automations: 30 }));
    const wsMed = createLargeWorkspace({ seed: 102, projects: 100, tasks: 2000, members: 50, notifications: 400, activities: 1000, documents: 100, automations: 30 });

    const tLargeGen = measure(() => createLargeWorkspace({ projects: 500, tasks: 10000, members: 200, notifications: 2000, activities: 5000, documents: 500, automations: 100 }));
    const wsLarge = createLargeWorkspace({ seed: 103, projects: 500, tasks: 10000, members: 200, notifications: 2000, activities: 5000, documents: 500, automations: 100 });

    results.push({
      operation: 'Workspace Generation',
      small: `${tSmallGen.toFixed(2)} ms`,
      medium: `${tMedGen.toFixed(2)} ms`,
      large: `${tLargeGen.toFixed(2)} ms`,
    });

    // 2. Integrity Validation
    const tSmallVal = measure(() => validateWorkspaceIntegrity(wsSmall), 5);
    const tMedVal = measure(() => validateWorkspaceIntegrity(wsMed), 3);
    const tLargeVal = measure(() => validateWorkspaceIntegrity(wsLarge), 1);
    results.push({
      operation: 'Integrity Validation (Full Audit)',
      small: `${tSmallVal.toFixed(2)} ms`,
      medium: `${tMedVal.toFixed(2)} ms`,
      large: `${tLargeVal.toFixed(2)} ms`,
    });

    // 3. Project Progress Recalculation (All Projects)
    const tSmallProg = measure(() => wsSmall.projects.forEach((p) => calculateProjectProgress(wsSmall.tasks, p.id)), 10);
    const tMedProg = measure(() => wsMed.projects.forEach((p) => calculateProjectProgress(wsMed.tasks, p.id)), 2);
    const tLargeProg = measure(() => wsLarge.projects.forEach((p) => calculateProjectProgress(wsLarge.tasks, p.id)), 1);
    results.push({
      operation: 'Project Progress (All Projects)',
      small: `${tSmallProg.toFixed(2)} ms`,
      medium: `${tMedProg.toFixed(2)} ms`,
      large: `${tLargeProg.toFixed(2)} ms`,
    });

    // 4. Member Workload Recalculation (All Members)
    const tSmallWork = measure(() => wsSmall.members.forEach((m) => calculateMemberWorkload(wsSmall.tasks, m.id)), 10);
    const tMedWork = measure(() => wsMed.members.forEach((m) => calculateMemberWorkload(wsMed.tasks, m.id)), 2);
    const tLargeWork = measure(() => wsLarge.members.forEach((m) => calculateMemberWorkload(wsLarge.tasks, m.id)), 1);
    results.push({
      operation: 'Member Workload (All Members)',
      small: `${tSmallWork.toFixed(2)} ms`,
      medium: `${tMedWork.toFixed(2)} ms`,
      large: `${tLargeWork.toFixed(2)} ms`,
    });

    // 5. Search Across Tasks, Projects, Members, Docs
    const searchQueries = ['optimize', 'security', 'infra', 'auth'];
    function runSearch(ws: typeof wsLarge) {
      for (const q of searchQueries) {
        ws.tasks.filter((t) => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q));
        ws.projects.filter((p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
        ws.members.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
      }
    }
    const tSmallSearch = measure(() => runSearch(wsSmall), 20);
    const tMedSearch = measure(() => runSearch(wsMed), 5);
    const tLargeSearch = measure(() => runSearch(wsLarge), 1);
    results.push({
      operation: 'Search (4 representative queries)',
      small: `${tSmallSearch.toFixed(2)} ms`,
      medium: `${tMedSearch.toFixed(2)} ms`,
      large: `${tLargeSearch.toFixed(2)} ms`,
    });

    // 6. Automation Evaluation
    const tSmallAuto = measure(() => processWorkspaceAutomation(wsSmall.automations, { type: 'TASK_CREATED', task: wsSmall.tasks[0] }, wsSmall.tasks, wsSmall.projects), 10);
    const tMedAuto = measure(() => processWorkspaceAutomation(wsMed.automations, { type: 'TASK_CREATED', task: wsMed.tasks[0] }, wsMed.tasks, wsMed.projects), 5);
    const tLargeAuto = measure(() => processWorkspaceAutomation(wsLarge.automations, { type: 'TASK_CREATED', task: wsLarge.tasks[0] }, wsLarge.tasks, wsLarge.projects), 1);
    results.push({
      operation: 'Automation Evaluation (Task Event)',
      small: `${tSmallAuto.toFixed(2)} ms`,
      medium: `${tMedAuto.toFixed(2)} ms`,
      large: `${tLargeAuto.toFixed(2)} ms`,
    });

    // 7. Single Task Creation
    const tSmallCreate = measure(() => createTaskOp(wsSmall, { title: 'New Perf Task', projectId: wsSmall.projects[0].id }), 10);
    const tMedCreate = measure(() => createTaskOp(wsMed, { title: 'New Perf Task', projectId: wsMed.projects[0].id }), 5);
    const tLargeCreate = measure(() => createTaskOp(wsLarge, { title: 'New Perf Task', projectId: wsLarge.projects[0].id }), 1);
    results.push({
      operation: 'Create Single Task (Op + Metrics)',
      small: `${tSmallCreate.toFixed(2)} ms`,
      medium: `${tMedCreate.toFixed(2)} ms`,
      large: `${tLargeCreate.toFixed(2)} ms`,
    });

    // 8. Single Task Status Update
    const tSmallMove = measure(() => moveTaskStatusOp(wsSmall, wsSmall.tasks[0].id, 'Done'), 10);
    const tMedMove = measure(() => moveTaskStatusOp(wsMed, wsMed.tasks[0].id, 'Done'), 5);
    const tLargeMove = measure(() => moveTaskStatusOp(wsLarge, wsLarge.tasks[0].id, 'Done'), 1);
    results.push({
      operation: 'Move Task Status (Op + Metrics)',
      small: `${tSmallMove.toFixed(2)} ms`,
      medium: `${tMedMove.toFixed(2)} ms`,
      large: `${tLargeMove.toFixed(2)} ms`,
    });

    // 9. Analytics Telemetry Derivation
    const tSmallAnalytics = measure(() => buildCompositeTelemetrySeries('month', wsSmall.tasks.length, 10), 50);
    const tMedAnalytics = measure(() => buildCompositeTelemetrySeries('month', wsMed.tasks.length, 500), 50);
    const tLargeAnalytics = measure(() => buildCompositeTelemetrySeries('month', wsLarge.tasks.length, 2500), 50);
    results.push({
      operation: 'Analytics Composite Series Derivation',
      small: `${tSmallAnalytics.toFixed(3)} ms`,
      medium: `${tMedAnalytics.toFixed(3)} ms`,
      large: `${tLargeAnalytics.toFixed(3)} ms`,
    });

    // 10. Persistence Serialization (JSON.stringify)
    let smallBytes = 0;
    let medBytes = 0;
    let largeBytes = 0;
    const tSmallJson = measure(() => {
      const json = JSON.stringify(wsSmall);
      smallBytes = json.length;
    }, 5);
    const tMedJson = measure(() => {
      const json = JSON.stringify(wsMed);
      medBytes = json.length;
    }, 2);
    const tLargeJson = measure(() => {
      const json = JSON.stringify(wsLarge);
      largeBytes = json.length;
    }, 1);
    results.push({
      operation: 'JSON Serialization (State Payload)',
      small: `${tSmallJson.toFixed(2)} ms (${(smallBytes / 1024).toFixed(1)} KB)`,
      medium: `${tMedJson.toFixed(2)} ms (${(medBytes / 1024).toFixed(1)} KB)`,
      large: `${tLargeJson.toFixed(2)} ms (${(largeBytes / 1024).toFixed(1)} KB)`,
    });

    // Output formatted markdown table for PERFORMANCE.md
    console.log('\n--- NEXUS BENCHMARK HARNESS RESULTS ---');
    console.log('| Benchmark Operation | Small (6 prj / 40 tasks) | Medium (100 prj / 2k tasks) | Large (500 prj / 10k tasks) |');
    console.log('| :--- | :---: | :---: | :---: |');
    for (const r of results) {
      console.log(`| ${r.operation} | ${r.small} | ${r.medium} | ${r.large} |`);
    }
    console.log('---------------------------------------\n');

    expect(results.length).toBe(10);
    // At large scale, integrity check should complete within 1.5 seconds
    expect(tLargeVal).toBeLessThan(1500);
  });
});
