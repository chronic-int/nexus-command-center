import { Project, Task, TeamMember, Document, Notification, AutomationRule, ActivityItem } from '../types';

export const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@nexus.io',
    role: 'Staff Product Engineer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    workload: 78,
    availability: 'Active',
    currentProjectId: 'proj-1',
    bio: 'Lead architect for core infrastructure and real-time distributed state engines.'
  },
  {
    id: 'user-2',
    name: 'Elena Rostova',
    email: 'elena.r@nexus.io',
    role: 'Principal Systems Architect',
    department: 'Infrastructure',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    workload: 85,
    availability: 'In a meeting',
    currentProjectId: 'proj-4',
    bio: 'Specializing in zero-trust architecture, edge replication, and low-latency APIs.'
  },
  {
    id: 'user-3',
    name: 'Marcus Vance',
    email: 'marcus.v@nexus.io',
    role: 'Senior UI/UX Engineer',
    department: 'Product Design',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    workload: 62,
    availability: 'Active',
    currentProjectId: 'proj-3',
    bio: 'Crafting accessible design systems, fluid microinteractions, and tactile interfaces.'
  },
  {
    id: 'user-4',
    name: 'Priyah Patel',
    email: 'priyah.p@nexus.io',
    role: 'Group Product Manager',
    department: 'Product',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    workload: 92,
    availability: 'Active',
    currentProjectId: 'proj-2',
    bio: 'Directing roadmap alignment, user telemetry research, and enterprise launch strategies.'
  },
  {
    id: 'user-5',
    name: 'Liam Chen',
    email: 'liam.c@nexus.io',
    role: 'Staff DevOps Specialist',
    department: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    workload: 70,
    availability: 'Active',
    currentProjectId: 'proj-1',
    bio: 'Kubernetes wizard, GitOps champion, and observability benchmark keeper.'
  },
  {
    id: 'user-6',
    name: 'Sarah Jenkins',
    email: 'sarah.j@nexus.io',
    role: 'Cybersecurity Engineer',
    department: 'Security',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    workload: 54,
    availability: 'Away',
    currentProjectId: 'proj-5',
    bio: 'Penetration testing, cryptographic key rotation, and automated audit trails.'
  },
  {
    id: 'user-7',
    name: 'David Kim',
    email: 'david.k@nexus.io',
    role: 'QA & Reliability Lead',
    department: 'Quality Assurance',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    workload: 68,
    availability: 'Active',
    currentProjectId: 'proj-6',
    bio: 'End-to-end integration harness builder and automated performance regression tracker.'
  },
  {
    id: 'user-8',
    name: 'Maya Lin',
    email: 'maya.lin@nexus.io',
    role: 'Product Designer',
    department: 'Product Design',
    avatar: 'https://images.unsplash.com/photo-1534751516642-a171ed2c3f86?w=150&auto=format&fit=crop&q=80',
    workload: 48,
    availability: 'Offline',
    currentProjectId: 'proj-3',
    bio: 'Visual design systems, high-fidelity interaction prototypes, and brand storytelling.'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    key: 'AUR',
    name: 'Aurora Cloud Engine',
    description: 'Next-generation distributed compute engine with millisecond cold-starts and edge multi-region routing.',
    category: 'Core Infrastructure',
    health: 'On Track',
    progress: 74,
    deadline: '2026-10-15',
    startDate: '2026-07-01',
    leadId: 'user-1',
    memberIds: ['user-1', 'user-2', 'user-5'],
    color: '#6366f1',
    tags: ['Distributed', 'Rust', 'Kubernetes', 'Edge']
  },
  {
    id: 'proj-2',
    key: 'PLS',
    name: 'Pulse Mobile v3',
    description: 'Cross-platform iOS and Android enterprise executive dashboard featuring offline caching and biometric sync.',
    category: 'Mobile Applications',
    health: 'At Risk',
    progress: 58,
    deadline: '2026-10-02',
    startDate: '2026-06-15',
    leadId: 'user-4',
    memberIds: ['user-4', 'user-3', 'user-7'],
    color: '#0ea5e9',
    tags: ['React Native', 'Offline-First', 'Security']
  },
  {
    id: 'proj-3',
    key: 'DSN',
    name: 'Nexus Design System',
    description: 'Comprehensive token-based component library, dark/light contrast validation, and Figma-to-code sync token pipeline.',
    category: 'Design Systems',
    health: 'On Track',
    progress: 88,
    deadline: '2026-09-30',
    startDate: '2026-05-10',
    leadId: 'user-3',
    memberIds: ['user-3', 'user-8', 'user-1'],
    color: '#8b5cf6',
    tags: ['Tailwind', 'Accessibility', 'Tokens', 'Figma']
  },
  {
    id: 'proj-4',
    key: 'SNT',
    name: 'Sentinel Security Gateway',
    description: 'Zero-trust API proxy handling OAuth 2.1, JWT rotation, mTLS validation, and threat anomaly detection.',
    category: 'Cybersecurity',
    health: 'Delayed',
    progress: 42,
    deadline: '2026-10-20',
    startDate: '2026-08-01',
    leadId: 'user-2',
    memberIds: ['user-2', 'user-6', 'user-5'],
    color: '#f43f5e',
    tags: ['Zero-Trust', 'WAF', 'Compliance', 'Audit']
  },
  {
    id: 'proj-5',
    key: 'AEG',
    name: 'Aegis Compliance Engine',
    description: 'SOC2 Type II and GDPR continuous compliance automation engine with live policy auditing.',
    category: 'Governance',
    health: 'On Track',
    progress: 65,
    deadline: '2026-11-10',
    startDate: '2026-08-15',
    leadId: 'user-6',
    memberIds: ['user-6', 'user-4', 'user-7'],
    color: '#10b981',
    tags: ['SOC2', 'GDPR', 'Automations', 'Audit']
  },
  {
    id: 'proj-6',
    key: 'ORB',
    name: 'Orbit Analytics Pipeline',
    description: 'Real-time event streaming pipeline processing 250k events/sec using Apache Kafka, ClickHouse, and Arrow.',
    category: 'Data Engineering',
    health: 'On Track',
    progress: 81,
    deadline: '2026-10-08',
    startDate: '2026-07-20',
    leadId: 'user-5',
    memberIds: ['user-5', 'user-1', 'user-7'],
    color: '#f59e0b',
    tags: ['ClickHouse', 'Kafka', 'Streaming', 'Telemetry']
  }
];

export const INITIAL_TASKS: Task[] = [
  // Aurora Cloud Engine (proj-1)
  {
    id: 'task-1',
    key: 'AUR-101',
    title: 'Implement distributed consensus heartbeats via Raft protocol',
    description: 'Refactor peer node synchronization to use an asynchronous Raft consensus heartbeat loop with configurable drift tolerance.',
    status: 'In Progress',
    priority: 'Urgent',
    projectId: 'proj-1',
    assigneeId: 'user-1',
    dueDate: '2026-09-26',
    startDate: '2026-09-18',
    estimatedHours: 24,
    labels: ['Rust', 'Distributed', 'Core'],
    subtasks: [
      { id: 'sub-1', title: 'Define leader election timeout jitter', completed: true },
      { id: 'sub-2', title: 'Implement gRPC bi-directional stream', completed: true },
      { id: 'sub-3', title: 'Write fuzzy network partition test suite', completed: false }
    ],
    comments: [
      { id: 'comm-1', authorId: 'user-2', content: 'Ensure the jitter calculation accommodates clock drift in AWS eu-central-1.', timestamp: '2026-09-21T10:15:00Z' },
      { id: 'comm-2', authorId: 'user-1', content: 'Added jitter tests with sim-net, passing reliably under 35ms packet loss.', timestamp: '2026-09-21T14:30:00Z' }
    ],
    attachments: [
      { id: 'att-1', name: 'raft_consensus_benchmarks.pdf', size: '1.4 MB', type: 'application/pdf', uploadedAt: '2026-09-20' }
    ],
    createdAt: '2026-09-18T09:00:00Z',
    updatedAt: '2026-09-21T14:30:00Z'
  },
  {
    id: 'task-2',
    key: 'AUR-102',
    title: 'Optimize memory allocators in WebAssembly sandbox runtime',
    description: 'Reduce cold-start heap allocation overhead by pre-allocating slab memory pools for worker isolates.',
    status: 'Done',
    priority: 'High',
    projectId: 'proj-1',
    assigneeId: 'user-1',
    dueDate: '2026-09-20',
    startDate: '2026-09-15',
    estimatedHours: 16,
    labels: ['Performance', 'Wasm', 'Kernel'],
    subtasks: [
      { id: 'sub-4', title: 'Benchmark jemalloc vs mimalloc', completed: true },
      { id: 'sub-5', title: 'Deploy isolate pool warm-up daemon', completed: true }
    ],
    comments: [
      { id: 'comm-3', authorId: 'user-5', content: 'Benchmark results showed a 42% decrease in p99 allocation latency!', timestamp: '2026-09-20T17:00:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-15T11:00:00Z',
    updatedAt: '2026-09-20T17:00:00Z'
  },
  {
    id: 'task-3',
    key: 'AUR-103',
    title: 'Configure automated canary deployments in Helm charts',
    description: 'Introduce Argo Rollouts step analysis checking Prometheus 5xx error ratios before traffic weight promotion.',
    status: 'Review',
    priority: 'Medium',
    projectId: 'proj-1',
    assigneeId: 'user-5',
    dueDate: '2026-09-28',
    startDate: '2026-09-21',
    estimatedHours: 12,
    labels: ['DevOps', 'Kubernetes', 'CI/CD'],
    subtasks: [
      { id: 'sub-6', title: 'Write Prometheus MetricTemplate', completed: true },
      { id: 'sub-7', title: 'Simulate 10% rollback on synthetic error spike', completed: false }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-21T08:30:00Z',
    updatedAt: '2026-09-21T16:00:00Z'
  },
  {
    id: 'task-4',
    key: 'AUR-104',
    title: 'Write high-availability failover runbook for edge nodes',
    description: 'Document exact step-by-step procedures for edge POP network isolate scenarios and DNS Anycast rerouting.',
    status: 'Todo',
    priority: 'Low',
    projectId: 'proj-1',
    assigneeId: 'user-2',
    dueDate: '2026-10-04',
    startDate: '2026-09-25',
    estimatedHours: 8,
    labels: ['Docs', 'Operations'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T14:00:00Z',
    updatedAt: '2026-09-20T14:00:00Z'
  },
  {
    id: 'task-5',
    key: 'AUR-105',
    title: 'Migrate internal metadata cache from Redis to DragonflyDB',
    description: 'Evaluate read throughput and memory footprint under multi-threaded Redis compatible Dragonfly engine.',
    status: 'Backlog',
    priority: 'Medium',
    projectId: 'proj-1',
    assigneeId: 'user-5',
    dueDate: '2026-10-12',
    estimatedHours: 20,
    labels: ['Database', 'Cache'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-21T09:00:00Z',
    updatedAt: '2026-09-21T09:00:00Z'
  },

  // Pulse Mobile v3 (proj-2)
  {
    id: 'task-6',
    key: 'PLS-201',
    title: 'Fix biometric FaceID authentication loop on iOS 18 beta',
    description: 'Resolve edge case where keychain entitlement query fails during rapid background app switching.',
    status: 'In Progress',
    priority: 'Urgent',
    projectId: 'proj-2',
    assigneeId: 'user-4',
    dueDate: '2026-09-24',
    startDate: '2026-09-19',
    estimatedHours: 14,
    labels: ['iOS', 'Security', 'Bug'],
    subtasks: [
      { id: 'sub-8', title: 'Reproduce on iPhone 16 Pro simulator', completed: true },
      { id: 'sub-9', title: 'Handle LAContext biometric cancellation gracefully', completed: false }
    ],
    comments: [
      { id: 'comm-4', authorId: 'user-7', content: 'Affects approximately 18% of beta testers on iOS 18.0.1.', timestamp: '2026-09-20T11:00:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-19T10:00:00Z',
    updatedAt: '2026-09-21T11:30:00Z'
  },
  {
    id: 'task-7',
    key: 'PLS-202',
    title: 'Implement WatermelonDB local SQLite delta synchronization',
    description: 'Provide offline query capabilities and conflict resolution when syncing multi-tenant task graphs over cellular data.',
    status: 'Todo',
    priority: 'High',
    projectId: 'proj-2',
    assigneeId: 'user-3',
    dueDate: '2026-09-29',
    startDate: '2026-09-22',
    estimatedHours: 32,
    labels: ['Offline', 'Database', 'Mobile'],
    subtasks: [
      { id: 'sub-10', title: 'Write migration schemas for v3 database', completed: false },
      { id: 'sub-11', title: 'Implement last-write-wins CRDT timestamp validator', completed: false }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-19T14:20:00Z',
    updatedAt: '2026-09-20T09:00:00Z'
  },
  {
    id: 'task-8',
    key: 'PLS-203',
    title: 'Audit battery drain profile during background push socket listen',
    description: 'Profile battery thermal state when keep-alive heartbeat interval is under 60 seconds.',
    status: 'Review',
    priority: 'Medium',
    projectId: 'proj-2',
    assigneeId: 'user-7',
    dueDate: '2026-09-25',
    startDate: '2026-09-18',
    estimatedHours: 10,
    labels: ['Performance', 'QA', 'Mobile'],
    subtasks: [
      { id: 'sub-12', title: 'Profile with Xcode Instruments Energy Log', completed: true },
      { id: 'sub-13', title: 'Increase backoff to 180s when battery < 20%', completed: true }
    ],
    comments: [
      { id: 'comm-5', authorId: 'user-4', content: 'Looks great, energy impact dropped from Very High to Low.', timestamp: '2026-09-21T15:20:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-18T16:00:00Z',
    updatedAt: '2026-09-21T15:20:00Z'
  },
  {
    id: 'task-9',
    key: 'PLS-204',
    title: 'Haptic feedback integration for Kanban swipe gestures',
    description: 'Add subtle UIImpactFeedbackGenerator light/medium clicks when dragging tasks between board columns on mobile.',
    status: 'Done',
    priority: 'Low',
    projectId: 'proj-2',
    assigneeId: 'user-3',
    dueDate: '2026-09-19',
    startDate: '2026-09-17',
    estimatedHours: 6,
    labels: ['UX', 'Haptics'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-17T11:00:00Z',
    updatedAt: '2026-09-19T18:00:00Z'
  },
  {
    id: 'task-10',
    key: 'PLS-205',
    title: 'Android 15 edge-to-edge system navigation support',
    description: 'Ensure insets accommodate 3-button and gesture bar without clipping the bottom action bar.',
    status: 'Backlog',
    priority: 'Medium',
    projectId: 'proj-2',
    assigneeId: 'user-3',
    dueDate: '2026-10-14',
    estimatedHours: 12,
    labels: ['Android', 'UI'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z'
  },

  // Nexus Design System (proj-3)
  {
    id: 'task-11',
    key: 'DSN-301',
    title: 'Ship WCAG 2.1 AAA high-contrast theme token sets',
    description: 'Review color tokens across text, borders, and interactive states to maintain minimum 7:1 contrast ratio.',
    status: 'In Progress',
    priority: 'High',
    projectId: 'proj-3',
    assigneeId: 'user-8',
    dueDate: '2026-09-27',
    startDate: '2026-09-20',
    estimatedHours: 18,
    labels: ['Accessibility', 'Design Tokens', 'Figma'],
    subtasks: [
      { id: 'sub-14', title: 'Audit button hover focus rings', completed: true },
      { id: 'sub-15', title: 'Test amber and red status tags on dark slate backgrounds', completed: false }
    ],
    comments: [
      { id: 'comm-6', authorId: 'user-3', content: 'Adjusted amber-500 to amber-400 in dark mode to hit 7.2:1 contrast.', timestamp: '2026-09-21T13:40:00Z' }
    ],
    attachments: [
      { id: 'att-2', name: 'contrast_audit_matrix.xlsx', size: '220 KB', type: 'application/vnd.ms-excel', uploadedAt: '2026-09-20' }
    ],
    createdAt: '2026-09-20T09:00:00Z',
    updatedAt: '2026-09-21T13:40:00Z'
  },
  {
    id: 'task-12',
    key: 'DSN-302',
    title: 'Develop virtualized data table component with sticky headers',
    description: 'Build a performant table handling 10,000+ items at 60fps with resizable columns and multi-row selection.',
    status: 'Done',
    priority: 'Urgent',
    projectId: 'proj-3',
    assigneeId: 'user-3',
    dueDate: '2026-09-21',
    startDate: '2026-09-14',
    estimatedHours: 28,
    labels: ['React', 'Performance', 'Components'],
    subtasks: [
      { id: 'sub-16', title: 'Windowing with dynamic row heights', completed: true },
      { id: 'sub-17', title: 'Keyboard navigation (arrow keys + Shift)', completed: true }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-09-21T16:00:00Z'
  },
  {
    id: 'task-13',
    key: 'DSN-303',
    title: 'Create animated collapsible Command Palette component',
    description: 'Implement raycast-style keyboard action palette with fuzzy search and group headers.',
    status: 'Done',
    priority: 'High',
    projectId: 'proj-3',
    assigneeId: 'user-1',
    dueDate: '2026-09-18',
    startDate: '2026-09-12',
    estimatedHours: 20,
    labels: ['UI', 'Keybindings'],
    subtasks: [
      { id: 'sub-18', title: 'Global ⌘K and / shortcut listener', completed: true },
      { id: 'sub-19', title: 'Smooth dialog backdrop blur', completed: true }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-18T17:00:00Z'
  },
  {
    id: 'task-14',
    key: 'DSN-304',
    title: 'Publish v2.4 NPM package and update Storybook catalog',
    description: 'Package release notes, run automated visual regression tests via Chromatic, and tag v2.4.0.',
    status: 'Todo',
    priority: 'Medium',
    projectId: 'proj-3',
    assigneeId: 'user-8',
    dueDate: '2026-09-30',
    startDate: '2026-09-26',
    estimatedHours: 8,
    labels: ['Release', 'Storybook', 'Documentation'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T11:00:00Z',
    updatedAt: '2026-09-20T11:00:00Z'
  },

  // Sentinel Security Gateway (proj-4)
  {
    id: 'task-15',
    key: 'SNT-401',
    title: 'Implement OAuth 2.1 Demonstrating Proof-of-Possession (DPoP)',
    description: 'Enforce RFC 9449 sender-constrained tokens preventing token replay and man-in-the-middle exfiltration.',
    status: 'In Progress',
    priority: 'Urgent',
    projectId: 'proj-4',
    assigneeId: 'user-2',
    dueDate: '2026-09-25',
    startDate: '2026-09-16',
    estimatedHours: 26,
    labels: ['Security', 'OAuth', 'Crypto'],
    subtasks: [
      { id: 'sub-20', title: 'Verify JWK thumbprint in header', completed: true },
      { id: 'sub-21', title: 'DPoP proof replay cache with TTL', completed: false }
    ],
    comments: [
      { id: 'comm-7', authorId: 'user-6', content: 'Crucial for passing upcoming external enterprise banking audit.', timestamp: '2026-09-21T09:15:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-09-21T14:00:00Z'
  },
  {
    id: 'task-16',
    key: 'SNT-402',
    title: 'Automate mTLS mutual certificate rotation via SPIFFE/SPIRE',
    description: 'Ensure short-lived 60-minute X.509 SVID credentials cycle seamlessly without TCP connection drops.',
    status: 'Todo',
    priority: 'High',
    projectId: 'proj-4',
    assigneeId: 'user-6',
    dueDate: '2026-10-05',
    startDate: '2026-09-24',
    estimatedHours: 22,
    labels: ['mTLS', 'PKI', 'Infrastructure'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-19T15:00:00Z',
    updatedAt: '2026-09-19T15:00:00Z'
  },
  {
    id: 'task-17',
    key: 'SNT-403',
    title: 'WAF rate limiter anomaly detection using sliding log algorithms',
    description: 'Prevent credential stuffing bursts by throttling abusive IPs dynamically based on entropy scoring.',
    status: 'Review',
    priority: 'Urgent',
    projectId: 'proj-4',
    assigneeId: 'user-2',
    dueDate: '2026-09-23',
    startDate: '2026-09-17',
    estimatedHours: 18,
    labels: ['WAF', 'Algorithms', 'Defense'],
    subtasks: [
      { id: 'sub-22', title: 'Implement Redis token bucket', completed: true },
      { id: 'sub-23', title: 'Add Prometheus metrics for blocked CIDR blocks', completed: true }
    ],
    comments: [
      { id: 'comm-8', authorId: 'user-5', content: 'Synthetic bot test showed 99.98% capture rate on login attempts.', timestamp: '2026-09-21T16:45:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-17T11:00:00Z',
    updatedAt: '2026-09-21T16:45:00Z'
  },
  {
    id: 'task-18',
    key: 'SNT-404',
    title: 'Sanitize log pipelines to redact PII and session headers',
    description: 'Add proactive regex maskers for Authorization Bearer tokens, passwords, and credit card numbers.',
    status: 'Backlog',
    priority: 'Low',
    projectId: 'proj-4',
    assigneeId: 'user-6',
    dueDate: '2026-10-18',
    estimatedHours: 10,
    labels: ['Compliance', 'Logging'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T16:00:00Z',
    updatedAt: '2026-09-20T16:00:00Z'
  },

  // Aegis Compliance Engine (proj-5)
  {
    id: 'task-19',
    key: 'AEG-501',
    title: 'Automate evidence collection for SOC2 CC6.1 logical access controls',
    description: 'Fetch Okta IdP SCIM assignment logs and compare against GitHub organization owners on a daily cron.',
    status: 'In Progress',
    priority: 'High',
    projectId: 'proj-5',
    assigneeId: 'user-6',
    dueDate: '2026-10-02',
    startDate: '2026-09-21',
    estimatedHours: 16,
    labels: ['SOC2', 'Automation', 'Okta'],
    subtasks: [
      { id: 'sub-24', title: 'Write SCIM user export query', completed: true },
      { id: 'sub-25', title: 'Generate diff alert when unmapped user exists', completed: false }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-21T08:00:00Z',
    updatedAt: '2026-09-21T12:00:00Z'
  },
  {
    id: 'task-20',
    key: 'AEG-502',
    title: 'GDPR right-to-be-forgotten cascading deletion worker',
    description: 'Safely tombstone customer account records across relational DBs, object stores, and analytics warehouses.',
    status: 'Todo',
    priority: 'Urgent',
    projectId: 'proj-5',
    assigneeId: 'user-4',
    dueDate: '2026-09-29',
    startDate: '2026-09-23',
    estimatedHours: 24,
    labels: ['GDPR', 'Worker', 'Data'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z'
  },
  {
    id: 'task-21',
    key: 'AEG-503',
    title: 'Quarterly access review certification workflow for managers',
    description: 'Interactive dashboard allowing engineering managers to sign off on team member permissions.',
    status: 'Done',
    priority: 'Medium',
    projectId: 'proj-5',
    assigneeId: 'user-7',
    dueDate: '2026-09-15',
    startDate: '2026-09-08',
    estimatedHours: 16,
    labels: ['Audit', 'Workflow'],
    subtasks: [
      { id: 'sub-26', title: 'Manager sign-off e-signature flow', completed: true },
      { id: 'sub-27', title: 'Export auditor-ready PDF report', completed: true }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: '2026-09-15T16:00:00Z'
  },
  {
    id: 'task-22',
    key: 'AEG-504',
    title: 'AWS CloudTrail immutable bucket policy verification',
    description: 'Ensure Object Lock compliance mode is enabled on all S3 audit archives.',
    status: 'Backlog',
    priority: 'Low',
    projectId: 'proj-5',
    assigneeId: 'user-6',
    dueDate: '2026-10-25',
    estimatedHours: 6,
    labels: ['AWS', 'Security'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-21T14:00:00Z',
    updatedAt: '2026-09-21T14:00:00Z'
  },

  // Orbit Analytics Pipeline (proj-6)
  {
    id: 'task-23',
    key: 'ORB-601',
    title: 'Tune ClickHouse MergeTree indexing for session attribution',
    description: 'Optimize primary key ordering and partitioning schemes for multi-tenant analytics queries over 500M rows.',
    status: 'In Progress',
    priority: 'High',
    projectId: 'proj-6',
    assigneeId: 'user-5',
    dueDate: '2026-09-27',
    startDate: '2026-09-19',
    estimatedHours: 20,
    labels: ['ClickHouse', 'Database', 'SQL'],
    subtasks: [
      { id: 'sub-28', title: 'Benchmark ZSTD vs LZ4 compression', completed: true },
      { id: 'sub-29', title: 'Optimize bloom filter granularity on tenant_id', completed: false }
    ],
    comments: [
      { id: 'comm-9', authorId: 'user-1', content: 'Query response on 90-day time series dropped from 840ms to 62ms!', timestamp: '2026-09-21T17:10:00Z' }
    ],
    attachments: [],
    createdAt: '2026-09-19T13:00:00Z',
    updatedAt: '2026-09-21T17:10:00Z'
  },
  {
    id: 'task-24',
    key: 'ORB-602',
    title: 'Build Kafka dead-letter queue consumer with replay UI',
    description: 'Create a web interface for engineering to inspect poisoned JSON messages and trigger selective replay.',
    status: 'Review',
    priority: 'Medium',
    projectId: 'proj-6',
    assigneeId: 'user-7',
    dueDate: '2026-09-25',
    startDate: '2026-09-18',
    estimatedHours: 14,
    labels: ['Kafka', 'Tooling', 'UI'],
    subtasks: [
      { id: 'sub-30', title: 'DLQ schema validation error parser', completed: true },
      { id: 'sub-31', title: 'Replay authorization guardrails', completed: true }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-21T15:00:00Z'
  },
  {
    id: 'task-25',
    key: 'ORB-603',
    title: 'Expose OpenTelemetry metrics exporter for ingest lag',
    description: 'Publish consumer group lag gauges to Prometheus to trigger auto-scaling on consumer worker pods.',
    status: 'Done',
    priority: 'Medium',
    projectId: 'proj-6',
    assigneeId: 'user-5',
    dueDate: '2026-09-18',
    startDate: '2026-09-13',
    estimatedHours: 8,
    labels: ['Observability', 'OTel'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-13T09:00:00Z',
    updatedAt: '2026-09-18T16:00:00Z'
  },
  {
    id: 'task-26',
    key: 'ORB-604',
    title: 'Stream Apache Arrow columnar payloads directly to browser',
    description: 'Use WebAssembly to unpack Arrow buffers client-side for zero-copy interactive charts.',
    status: 'Todo',
    priority: 'High',
    projectId: 'proj-6',
    assigneeId: 'user-1',
    dueDate: '2026-10-06',
    startDate: '2026-09-26',
    estimatedHours: 24,
    labels: ['Arrow', 'Wasm', 'Frontend'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T17:00:00Z',
    updatedAt: '2026-09-20T17:00:00Z'
  },
  {
    id: 'task-27',
    key: 'AUR-106',
    title: 'Setup automated benchmark suite against AWS Lambda and Cloudflare Workers',
    description: 'Publish weekly comparative latency metrics across cold starts, p50, and p99 runtimes.',
    status: 'In Progress',
    priority: 'Medium',
    projectId: 'proj-1',
    assigneeId: 'user-1',
    dueDate: '2026-09-30',
    startDate: '2026-09-20',
    estimatedHours: 12,
    labels: ['Benchmarks', 'Cloud'],
    subtasks: [
      { id: 'sub-32', title: 'Script synthetic k6 load testing suite', completed: true },
      { id: 'sub-33', title: 'Automate markdown report generator', completed: false }
    ],
    comments: [],
    attachments: [],
    createdAt: '2026-09-20T15:00:00Z',
    updatedAt: '2026-09-21T18:00:00Z'
  },
  {
    id: 'task-28',
    key: 'PLS-206',
    title: 'Universal deep linking for push notification routing',
    description: 'Ensure tap on comment notification routes directly to the task drawer with highlight effect.',
    status: 'Todo',
    priority: 'High',
    projectId: 'proj-2',
    assigneeId: 'user-4',
    dueDate: '2026-10-01',
    startDate: '2026-09-24',
    estimatedHours: 10,
    labels: ['Mobile', 'Notifications'],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-21T11:00:00Z',
    updatedAt: '2026-09-21T11:00:00Z'
  }
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    title: 'Aurora Engine Architecture RFC: v2.0 Execution Model',
    type: 'Architecture',
    projectId: 'proj-1',
    authorId: 'user-1',
    lastEdited: '2026-09-21T16:30:00Z',
    isFavorite: true,
    tags: ['RFC', 'Distributed', 'Core'],
    content: `# Aurora Engine v2.0 Architecture

## Executive Summary
Aurora v2 transitions our distributed execution layer from single-tenant container pools to shared, memory-isolated WebAssembly runtimes with microsecond start times.

## Key Objectives
1. **P99 Cold Start < 5ms**: Using pre-initialized Wasm linear memory spaces.
2. **Deterministic Resource Billing**: Gas meters mapped to physical instruction counts.
3. **Cross-Region Replication**: Asynchronous Raft state machine mirroring across 5 edge regions.

## Consensus & Failover
- **Leader Lease Duration**: 250ms with randomized 50ms heartbeat jitter.
- **Quorum Requirements**: 3 of 5 nodes must confirm write log index before ACK to client.
- **Failover Recovery**: Automatic snapshot compaction every 10,000 commits.

\`\`\`
Client -> Edge Envoy Proxy -> Raft Leader Node -> (Replicate to Quorum) -> Execute Wasm Sandbox -> Return
\`\`\`
`
  },
  {
    id: 'doc-2',
    title: 'Nexus Design Tokens Specification & Theming Matrix',
    type: 'Design System',
    projectId: 'proj-3',
    authorId: 'user-3',
    lastEdited: '2026-09-20T14:15:00Z',
    isFavorite: true,
    tags: ['Tokens', 'CSS', 'Accessibility'],
    content: `# Nexus Design System Tokens

## Color Philosophy
The NEXUS aesthetic is designed to evoke calm authority, high visual density, and surgical precision. 

### Spacing Scale
- **Base Unit**: 4px
- **Standard Densities**:
  - Compact: 4px padding, 6px gaps, 12px text
  - Comfortable: 8px padding, 12px gaps, 14px text

### Contrast Requirements
All interactive controls must meet WCAG 2.1 AAA (7:1 contrast ratio) in both light and dark modes.
`
  },
  {
    id: 'doc-3',
    title: 'Sentinel Zero-Trust API Proxy Security Whitepaper',
    type: 'Spec',
    projectId: 'proj-4',
    authorId: 'user-2',
    lastEdited: '2026-09-19T11:20:00Z',
    isFavorite: false,
    tags: ['Security', 'mTLS', 'OAuth'],
    content: `# Sentinel Zero-Trust API Gateway

## Threat Model
All internal and external communication is considered hostile. Perimeter defenses are discarded in favor of cryptographic proof-of-possession.

### Key Controls
- **DPoP (RFC 9449)**: Eliminates bearer token replay by signing requests with private keys.
- **SPIRE SVID**: Microservices exchange ephemeral X.509 certs with 1-hour expiration.
`
  },
  {
    id: 'doc-4',
    title: 'Sprint 34 Product Steering & Velocity Retro',
    type: 'Meeting Notes',
    projectId: 'proj-2',
    authorId: 'user-4',
    lastEdited: '2026-09-21T18:00:00Z',
    isFavorite: false,
    tags: ['Retro', 'Product', 'Velocity'],
    content: `# Sprint 34 Product Steering

**Attendees**: Alex, Priyah, Marcus, Elena, Liam  
**Date**: September 21, 2026

### Key Takeaways
- Mobile biometric sync issue is blocking beta release. Priyah prioritizing PLS-201.
- Aurora cold-start optimizations exceeded expectations (12ms down to 4.2ms).
- Team workload is peaking in Infrastructure due to concurrent Sentinel mTLS migration.
`
  },
  {
    id: 'doc-5',
    title: 'ClickHouse Partitioning & Ingestion SLA Benchmark',
    type: 'Spec',
    projectId: 'proj-6',
    authorId: 'user-5',
    lastEdited: '2026-09-18T15:45:00Z',
    isFavorite: false,
    tags: ['ClickHouse', 'Database', 'SLA'],
    content: `# Orbit Analytics Ingestion SLA

## Performance Targets
- **Max Ingestion Latency**: < 500ms from Kafka produce to ClickHouse visibility.
- **Compression Target**: > 10:1 ratio on structured event telemetry.
- **Storage Strategy**: Primary partition by month, secondary sort key by \`(tenant_id, event_type, timestamp)\`.
`
  },
  {
    id: 'doc-6',
    title: 'SOC2 Type II Audit Readiness & Controls Matrix',
    type: 'RFC',
    projectId: 'proj-5',
    authorId: 'user-6',
    lastEdited: '2026-09-17T09:30:00Z',
    isFavorite: true,
    tags: ['SOC2', 'Compliance', 'Audit'],
    content: `# SOC2 Type II Audit Framework

## Trust Service Criteria
1. **Security**: Multi-factor enforcement, static code analysis, vulnerability SLAs.
2. **Availability**: 99.95% uptime SLA across all primary regions.
3. **Confidentiality**: Customer data encrypted with tenant-specific KMS envelopes.
`
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Task Assigned',
    message: 'Priyah Patel assigned you to "Fix biometric FaceID authentication loop on iOS 18 beta".',
    category: 'Assignments',
    timestamp: '15m ago',
    read: false,
    targetType: 'task',
    targetId: 'task-6'
  },
  {
    id: 'notif-2',
    title: 'Urgent Deadline Approaching',
    message: 'Task AUR-101 is due in 48 hours and has 1 unresolved subtask.',
    category: 'Deadlines',
    timestamp: '1h ago',
    read: false,
    targetType: 'task',
    targetId: 'task-1'
  },
  {
    id: 'notif-3',
    title: 'New Mention in Discussion',
    message: 'Elena Rostova mentioned you in Sentinel Security Gateway: "Ensure jitter calculation accommodates clock drift".',
    category: 'Mentions',
    timestamp: '3h ago',
    read: false,
    targetType: 'task',
    targetId: 'task-1'
  },
  {
    id: 'notif-4',
    title: 'Project Status Changed',
    message: 'Sentinel Security Gateway was marked as Delayed by Elena Rostova.',
    category: 'Project updates',
    timestamp: '4h ago',
    read: true,
    targetType: 'project',
    targetId: 'proj-4'
  },
  {
    id: 'notif-5',
    title: 'Automated Canary Success',
    message: 'Helm canary deployment rollouts passed 100% health checks in eu-central-1.',
    category: 'System',
    timestamp: '6h ago',
    read: true,
    targetType: 'project',
    targetId: 'proj-1'
  },
  {
    id: 'notif-6',
    title: 'Document Published',
    message: 'Marcus Vance published "Nexus Design Tokens Specification & Theming Matrix".',
    category: 'Project updates',
    timestamp: '1d ago',
    read: true,
    targetType: 'document',
    targetId: 'doc-2'
  },
  {
    id: 'notif-7',
    title: 'Workload Threshold Warning',
    message: 'Priyah Patel has reached 92% workload capacity across 3 active initiatives.',
    category: 'System',
    timestamp: '1d ago',
    read: false,
    targetType: 'team',
    targetId: 'user-4'
  },
  {
    id: 'notif-8',
    title: 'Audit Rule Executed',
    message: 'Aegis Compliance Engine automatically certified 14 Okta IdP SCIM groups.',
    category: 'System',
    timestamp: '2d ago',
    read: true,
    targetType: 'project',
    targetId: 'proj-5'
  }
];

export const INITIAL_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Escalate Overdue Tasks to Urgent Priority',
    description: 'When a task crosses its deadline without being in Done status, automatically bump priority to Urgent and alert the project lead.',
    enabled: true,
    trigger: 'Task deadline expires',
    condition: 'Status != Done',
    action: 'Set Priority = Urgent & Send Notification',
    lastTriggered: '2 hours ago'
  },
  {
    id: 'auto-2',
    name: 'Auto-Recalculate Project Health on Blocker',
    description: 'When more than 3 tasks in a project are flagged Urgent or Overdue, automatically mark project status as At Risk.',
    enabled: true,
    trigger: 'Task status or priority changes',
    condition: 'Urgent count > 3',
    action: 'Update Project Health = At Risk',
    lastTriggered: 'Yesterday at 17:40'
  },
  {
    id: 'auto-3',
    name: 'Notify Tech Lead on Canary Deployment Review',
    description: 'When a DevOps or Infrastructure task moves to Review status, dispatch instant review request to Elena Rostova.',
    enabled: true,
    trigger: 'Task moved to Review column',
    condition: 'Label includes DevOps or Infrastructure',
    action: 'Create assignment notification for Elena',
    lastTriggered: '3 days ago'
  },
  {
    id: 'auto-4',
    name: 'Archive Completed Subtasks After 7 Days',
    description: 'Clean up completed checklist items once the parent task is marked Done.',
    enabled: false,
    trigger: 'Task marked Done for > 7 days',
    condition: 'All subtasks completed',
    action: 'Compress subtasks to audit history',
    lastTriggered: 'Never'
  }
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    userId: 'user-1',
    action: 'completed task',
    targetName: 'Optimize memory allocators in WebAssembly sandbox runtime',
    targetType: 'task',
    targetId: 'task-2',
    timestamp: '2 hours ago',
    projectId: 'proj-1'
  },
  {
    id: 'act-2',
    userId: 'user-2',
    action: 'moved task to Review',
    targetName: 'WAF rate limiter anomaly detection using sliding log algorithms',
    targetType: 'task',
    targetId: 'task-17',
    timestamp: '3 hours ago',
    projectId: 'proj-4'
  },
  {
    id: 'act-3',
    userId: 'user-4',
    action: 'created task',
    targetName: 'Fix biometric FaceID authentication loop on iOS 18 beta',
    targetType: 'task',
    targetId: 'task-6',
    timestamp: '5 hours ago',
    projectId: 'proj-2'
  },
  {
    id: 'act-4',
    userId: 'user-3',
    action: 'updated document',
    targetName: 'Nexus Design Tokens Specification & Theming Matrix',
    targetType: 'document',
    targetId: 'doc-2',
    timestamp: 'Yesterday',
    projectId: 'proj-3'
  },
  {
    id: 'act-5',
    userId: 'user-5',
    action: 'pushed commit to branch',
    targetName: 'feat: clickhouse primary key tuning',
    targetType: 'project',
    targetId: 'proj-6',
    timestamp: 'Yesterday',
    projectId: 'proj-6'
  }
];
