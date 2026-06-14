"""Common AttestationReport shape and scoring. A report is a plain dict so it
serialises straight into results JSON."""


def report(present=False, signature_valid=False, root_trusted=False,
           freshness_ok=False, channel_bound=False, binds_model=False,
           vendor=None, notes=None):
    r = {"present": present, "signature_valid": signature_valid,
         "root_trusted": root_trusted, "freshness_ok": freshness_ok,
         "channel_bound": channel_bound, "binds_model": binds_model,
         "vendor": vendor, "notes": notes or []}
    r["score"] = score(r)
    return r


def score(r):
    if not r["present"]:
        return 0
    s = 20
    s += 30 if r["signature_valid"] else 0
    s += 25 if r["root_trusted"] else 0
    s += 10 if r["freshness_ok"] else 0
    s += 5 if r["channel_bound"] else 0
    s += 10 if r["binds_model"] else 0
    return s
