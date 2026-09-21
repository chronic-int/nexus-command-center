# NEXUS — Intelligent Project Command Center

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**NEXUS** is an intelligent, high-density project command center designed for modern engineering and product teams. It unites the speed of Linear, the versatility of Notion, the structure of Asana, the efficiency of Raycast, and the analytical depth of modern telemetry software into an original, cohesive SaaS platform.

---

## 🌟 Key Features

### 1. Executive Command Center
- **Contextual Productivity Summary**: Intelligent time-of-day greeting and real-time active task telemetry.
- **KPI Metrics Ribbon**: Active projects, tasks completed, overdue items, and team velocity with period-over-period comparative deltas.
- **Project Health Matrix**: Real-time progress meters, health badges (*On Track*, *At Risk*, *Delayed*), target milestones, and team avatars.
- **Productivity & Velocity Telemetry**: Interactive Recharts area chart with 7-day, 30-day, and 90-day time filters and hover tooltips.
- **Team Workload Capacity**: Real-time member utilization gauges with automatic capacity saturation warnings (>85%).
- **NEXUS AI Insights**: Dynamic rule-based analytical module that continuously monitors blockers, capacity skew, and release risks based on live workspace data.

### 2. Interactive Kanban Board & Drag-and-Drop
- **5 Status Columns**: *Backlog*, *To Do*, *In Progress*, *Review*, and *Done*.
- **Fluid Drag-and-Drop**: Native HTML5 drag-and-drop with column hover cues and target highlights.
- **Cascading State Engine**: Moving a task automatically cascades updates to project completion %, project health status, team workload capacity, activity audit logs, and velocity charts.
- **Confetti Celebration**: Celebratory particle effects on task completion.

### 3. Slide-Over Task Detail Drawer
- Inspect any task without losing page context.
- Inline editable title and description with instant persistence.
- Attributes matrix: Status, Priority (*Urgent*, *High*, *Medium*, *Low*), Assignee, Project, Due Date.
- Interactive Subtasks checklist (add, toggle, delete) with progress percentage.
- Discussion thread with team avatars, timestamps, and live comment posting (`⌘ + Enter`).
- Action controls for duplicating tasks and deleting tasks (with toast-based **Undo**).

### 4. High-Density Task List Table
- Multi-column sorting (Title, Status, Priority, Due Date).
- Column filters (Status, Priority, Assignee) + text search.
- Multi-row selection checkboxes with a floating sticky bulk actions bar (*Bulk Status*, *Bulk Priority*, *Bulk Reassignment*, *Bulk Deletion*).

### 5. Raycast-Style Command Palette (`⌘K` / `Ctrl+K`)
- Omnipresent command modal accessible via `⌘K`, `Ctrl+K`, or `/`.
- Keyboard navigation: `↑` / `↓` arrows to navigate, `Enter` to select, `Esc` to close.
- Commands for rapid navigation, object creation, theme toggling, density toggling, and direct project jump-lists.

### 6. Timeline (Gantt) & Calendar Views
- **Timeline**: Horizontal date grid rendering tasks with status-colored duration bars, milestone flags, and a highlighted today marker.
- **Calendar**: Month and Week views with month navigation (Previous, Next, Today), deadline chips, and click-to-open drawer.

### 7. Operational Analytics
- Cumulative burnup scope trajectory curve.
- Engineer throughput comparison bar chart.
- Priority allocation and strategic portfolio distribution donut charts.
- Cycle time, merge latency, and sprint predictability KPI gauges.

### 8. Documents & RFC Workspace
- Document library filtered by type (*Spec*, *RFC*, *Architecture*, *Design System*, *Meeting Notes*).
- Favorite starring and search.
- Functional Markdown editor with toggleable live **Preview** mode.

### 9. Workflow Automations Hub
- Active `WHEN [Trigger] -> IF [Condition] -> THEN [Action]` rules.
- Enable/disable toggles, rule duplication, deletion, dry-run test simulation, and custom rule builder.

### 10. Design System, Dark/Light Themes & Persistence
- **Dual Themes**: Surgical obsidian dark mode (`#090d16`) and crisp light mode (`#ffffff`).
- **Density Control**: *Comfortable* (8px spacing) vs. *Compact* (4px high information density).
- **Local Persistence**: All state modifications persist in `localStorage`.
- **Reset Demo Data**: One-click restore button in Settings to safely reset initial mock telemetry.
- **WCAG Accessible**: Visible focus rings, keyboard navigation, high contrast ratios, and reduced-motion support.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| `⌘ K` / `Ctrl K` | Open Command Palette |
| `/` | Focus Global Search |
| `C` | Quick-create new Task |
| `?` | Show Keyboard Shortcuts Cheat Sheet |
| `Esc` | Close open drawers, modals, or dropdowns |
| `⌘ ↵` / `Ctrl Enter` | Submit comment in Task Drawer |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/chronic-int/nexus-command-center.git

# Navigate to directory
cd nexus-command-center

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit [`http://localhost:5173`](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v3
- **Icons**: Lucide React
- **Data Visualization**: Recharts
- **Celebrations**: Canvas Confetti
- **State Management**: Reactive Context API with LocalStorage Synchronization

---

## 📄 License

MIT License © 2026 Imran Jafar (chronic-int)
