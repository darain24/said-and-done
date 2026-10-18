# Security policy

Said & Done's output is meant to be published, so the thing most likely to go wrong is **a secret getting past redaction**.

## Reporting

Please report privately through [GitHub security advisories](https://github.com/darain24/said-and-done/security/advisories/new). Don't open a public issue, and don't include the real secret: a made-up string of the same shape is enough.

Useful to include:

- What kind of value got through (for example "a Stripe restricted key", "an internal hostname").
- Where it appeared (prompt text, a file path, a commit subject).
- Your `said --version`.

You'll get a reply within 7 days. Fixes for redaction misses ship as patch releases.

## Supported versions

The latest minor release gets fixes.

## Design guarantees

- The CLI makes no network requests and has no runtime dependencies.
- The generated page has a Content-Security-Policy that blocks outside requests.
- Redaction is on by default and runs before anything else sees the text.
- Git author emails are never read.
