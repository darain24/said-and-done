# Contributing to Said & Done

Thanks for helping. Said & Done is small on purpose: a zero-dependency Node CLI and a single-file React page.

## Set up

```bash
git clone https://github.com/darain24/said-and-done.git
cd said-and-done
npm install
npm run build
npm run check        # lint, typecheck, tests
```

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing the CLI and [`docs/DESIGN.md`](docs/DESIGN.md) before changing the page. Where the project is heading is in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Rules that matter

- **No runtime dependencies in the CLI.** Node built-ins only. Dev dependencies are fine.
- **Never commit raw session files.** Fixtures in `test/fixtures/` must be redacted and trimmed (`scripts/make-fixture.ts`).
- **No network access** from the CLI or the generated page.
- **Tests for every behaviour change.** `node:test`, one file per module. Name tests after the requirement where one exists (`FR-2: …`).
- **Tailwind classes in full.** No string-built class names; use lookup maps.

## Pull requests

1. Branch from `main`.
2. Make the change with tests.
3. Run `npm run check`.
4. If users will notice the change, add a changeset: `npm run changeset`.
5. Open the PR and fill in the template.

## Good first issues

Writing an adapter for another coding agent (roadmap U2) is a good way in: it touches one interface and comes with fixtures.

## Code of conduct

Be kind and assume good faith. This project follows the [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Report problems to the maintainer through a private GitHub security advisory or the email on their GitHub profile.
