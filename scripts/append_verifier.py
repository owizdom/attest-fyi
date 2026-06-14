#!/usr/bin/env python3
"""Append a verifier to verifiers.json from a GitHub-authenticated issue.

Run by .github/workflows/sign.yml on `issues: opened`. The signer's identity is
github.event.issue.user.login — GitHub vouches for it, so it cannot be spoofed
by typing someone else's handle in the body. Issue-signed entries are always
mode "witness" (the signer vouches they re-ran the published check); the
stronger "operator"/"owner" modes are only seeded by people who actually ran a
live cycle, never self-claimed through an issue.

Env in:  ISSUE_TITLE ("verify: <provider-id>"), ISSUE_AUTHOR, ISSUE_AT (ISO date)
Env out: appends to GITHUB_OUTPUT  result=<added|dup|unknown>  provider=<id>
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VFILE = os.path.join(ROOT, "verifiers.json")


def valid_providers():
    ids = set()
    for p in glob.glob(os.path.join(ROOT, "providers", "*.json")):
        try:
            ids.add(json.load(open(p))["id"])
        except Exception:
            pass
    return ids


def emit(**kv):
    out = os.environ.get("GITHUB_OUTPUT")
    line = " ".join("%s=%s" % (k, v) for k, v in kv.items())
    print(line)
    if out:
        with open(out, "a") as f:
            for k, v in kv.items():
                f.write("%s=%s\n" % (k, v))


def main():
    title = os.environ.get("ISSUE_TITLE", "")
    login = (os.environ.get("ISSUE_AUTHOR", "") or "").strip()
    at = (os.environ.get("ISSUE_AT", "") or "")[:10] or "unknown"

    m = re.match(r"\s*verify:\s*([A-Za-z0-9._-]+)\s*$", title)
    provider = m.group(1).lower() if m else ""
    if not provider or not login:
        emit(result="unknown", provider=provider or "?")
        return
    if provider not in valid_providers():
        emit(result="unknown", provider=provider)
        return

    data = json.load(open(VFILE))
    lst = data.setdefault(provider, [])
    if any(isinstance(v, dict) and v.get("login", "").lower() == login.lower() for v in lst):
        emit(result="dup", provider=provider)
        return
    lst.append({"login": login, "mode": "witness", "at": at})
    json.dump(data, open(VFILE, "w"), indent=2)
    open(VFILE, "a").write("\n")
    emit(result="added", provider=provider)


if __name__ == "__main__":
    main()
