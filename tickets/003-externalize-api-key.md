# Ticket 003: Externalize API Key via Environment Variables

**Priority:** High
**Severity:** P1 — Security
**Estimated Effort:** 0.5 day

---

## Description

The Google Maps API key `ABQIAAAAzr2E4OKY1hR5oD-82kx9TR` is hardcoded in `index.html`. This is a security risk — anyone can extract and abuse the key, potentially incurring billing charges on the account owner.

### Scope
- Remove hardcoded API key from `index.html`
- Create `.env.example` with documented variables
- Load API key from environment variable at build time
- Add `.env` to `.gitignore`
- Document key setup in README

---

## Expected Outcome

- `index.html` loads API key dynamically (via build-time injection or runtime env)
- `.env.example` exists with `VITE_GOOGLE_MAPS_API_KEY=your_key_here`
- `.env` is in `.gitignore`
- Application works when a valid key is provided
- No API keys in git history (consider rotation if the key is still active)

---

## Concerns

1. The project currently has zero build system. Until Ticket 002 is done, env variable injection requires either a simple script or runtime fetch of a config file.
2. If the hardcoded key is still valid, it should be rotated immediately (new key generated in Google Cloud Console).

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hardcoded key is still active and abused | Medium | High | Rotate key in Google Cloud Console immediately |
| Build-time injection not possible without bundler | Low | Medium | Use runtime config JSON as interim solution |
| Developers forget to set key locally | Low | Low | Clear error message and `.env.example` documentation |

---

## Dependencies

- **Blocks:** None
- **Blocked by:** None (do this first — it's quick and high-value)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3 (new key likely needed)
- Ticket 002: Add build system (enables build-time env injection)
