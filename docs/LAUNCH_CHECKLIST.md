# Public launch checklist

- [ ] Review the final readiness and blocker-resolution reports and release checksums.
- [ ] Separately authorize repository creation, hosted CI, and release upload; this preparation does not publish anything.
- [ ] **Enable GitHub Private vulnerability reporting immediately when repository visibility becomes public.**

Setting path: **Repository → Settings → Security and quality / Advanced Security → Private vulnerability reporting → Enable**. Confirm that the repository Security tab exposes **Report a vulnerability** before announcing the release. This toggle has not been performed; no public repository exists in this task.

GitHub documents this setting for public repositories in its [official configuration guide](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

- [ ] Perform a clean Windows beginner install, provider sign-in, doctor, first design/revision, and update trial. Existing-host setup smoke is not clean-machine evidence.
- [ ] Optionally replace screenshot/GIF placeholders with approved public examples.
