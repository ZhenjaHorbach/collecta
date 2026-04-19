# Code Style

## TypeScript

- Strict mode is on — no `any`, no `@ts-ignore`
- Prefer `unknown` over `any` when type is truly unknown, then narrow
- All function parameters and return types must be typed
- Use `satisfies` for config objects to get inference + validation

## Components

- Functional components only, no class components
- Named exports only — no default exports from component files
- One component per file; filename matches the export name (PascalCase)
- Props interface named `<ComponentName>Props`, defined above the component

## Imports

- Group imports: React/RN → third-party → internal (`~/src/`) → relative
- No barrel files (`index.ts` re-exports) that cause circular deps
- Absolute imports via `~/src/` alias for cross-directory references

## General

- No `console.log` in production code — use a logger utility
- No unused variables or imports (enforced by ESLint)
- Prefer `const` over `let`; avoid `var`
- Short-circuit over ternary for conditional rendering
