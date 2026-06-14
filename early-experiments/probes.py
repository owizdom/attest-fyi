"""Probe batteries for the early experiments.

DIVERGENCE probes are chosen to be deterministic at temperature 0 yet
elicit model-specific phrasing, so the same model repeats itself and
different models diverge. A real benchmark would generate these
parametrically from a seed; here they are fixed so the experiment is
exactly reproducible.
"""

DIVERGENCE = [
    "Continue with exactly the next eight words, nothing else: "
    "'In the quiet hours before the storm'",
    "Write the opening line of a poem about an empty train station. One line only.",
    "Give a single metaphor for trust, in under six words.",
    "Name a colour that is not in the rainbow. One word only.",
    "Invent a one-word name for a startup that audits AI. One word, no explanation.",
    "Finish this sentence in five words exactly: 'The seal was valid but'",
    "Give one word that rhymes with 'silver'.",
    "In one short sentence, explain why the sky is blue.",
    "Complete the analogy with one word: key is to lock as password is to ____",
    "Summarise the idea of trust in exactly three words.",
    "Write a six-word story about a broken promise.",
    "Pick an adjective to describe the colour of rust. One word.",
]
