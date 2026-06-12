---
trigger: always_on
---

When working on this codebase, please use the following scripts to build, lint, and run the project:

### Building client-side changes

To compile client-side code after making changes:

```bash
npm run build-client-nowatch:dev
```

### Building server-side changes

To compile and watch server-side backend changes:

```bash
npm run build-nowatch:dev
```

### Linting

To check code quality with ESLint:

```bash
npm run eslint
```

To auto-fix certain issues:

```bash
npm run eslint-fix
```

### Running the Application

To serve the project locally with hot reload:

```bash
npm run start:dev
```