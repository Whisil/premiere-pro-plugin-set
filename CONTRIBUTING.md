# Contributing

Use short-lived `feat/*`, `fix/*`, or `docs/*` branches and open a pull request into `main`. Each functional change must include automated tests or an Adobe-host test note. Do not commit Adobe SDK headers, generated media, local tokens, `.aep`, `.mogrt`, `.ccx`, or native build artifacts.

Before opening a pull request, run:

```sh
pnpm check
pnpm build
```

Native Adobe-host changes must also complete the checklist in `docs/testing/adobe-host-checklist.md`.
