"""Fingerprint metrics. Both run over aligned output lists at temperature 0."""
import difflib
import re
import statistics


def norm(s):
    return re.sub(r"\s+", " ", s.strip().lower())


def is_error(s):
    return s.startswith(("<ERR", "<EMPTY"))


def exact_rate(a, b):
    return sum(norm(x) == norm(y) for x, y in zip(a, b)) / len(a)


def sim_rate(a, b):
    return statistics.mean(
        difflib.SequenceMatcher(None, norm(x), norm(y)).ratio()
        for x, y in zip(a, b))


def error_count(outs):
    return sum(1 for x in outs if is_error(x))
