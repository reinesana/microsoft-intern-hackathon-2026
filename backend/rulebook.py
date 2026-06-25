"""
DESCRIPTION:
    Structured rulebook for the Aegis Dispatch NLP middleware.

    Maps dialect markers, slang, and culturally-specific phrases (AAVE,
    Southern, regional) to a plain-English meaning and a semantic category.
    The category drives the tag color in the dispatcher UI. Phrases are matched
    verbatim — the original transcript text is never rewritten.

    Categories:
        location  (blue)   - addresses / places
        medical   (green)  - symptoms / medical state
        intent    (purple) - actions / what someone is about to do
        vehicle   (yellow) - vehicle or suspect descriptions

USAGE:
    from rulebook import RULEBOOK, ADDRESSES
"""

# Phrase -> meaning + category. Keys are lowercase for case-insensitive lookup.
# `aave` flags dialect markers a standard-English reader may misread; `type`
# names the specific linguistic feature (shown as the "error type" header).
RULEBOOK = {
    "fell out": {
        "category": "medical",
        "meaning": "Collapsed / fainted — sudden loss of consciousness (syncope)",
        "aave": True,
        "type": "Idiom",
    },
    "come to": {
        "category": "medical",
        "meaning": "Regain consciousness / wake up. \"Won't come to\" = staying unconscious",
        "aave": True,
        "type": "Idiom",
    },
    "ain't breathin' right": {
        "category": "medical",
        "meaning": "Labored or abnormal breathing (dyspnea)",
        "aave": True,
        "type": "Negation + dialect",
    },
    "still out": {
        "category": "medical",
        "meaning": "Still unconscious / unresponsive",
        "aave": True,
        "type": "Idiom",
    },
    "his sugar": {
        "category": "medical",
        "meaning": "Blood sugar — likely diabetic (possible hypoglycemia)",
        "aave": True,
        "type": "Vocabulary",
    },
    "been low": {
        "category": "medical",
        "meaning": "Has been low for an extended time (stressed BIN = remote past)",
        "aave": True,
        "type": "Stressed BIN (remote past)",
    },
    "finna": {
        "category": "intent",
        "meaning": "About to / getting ready to ('fixing to' → 'finna')",
        "aave": True,
        "type": "Grammar (going-to future)",
    },
    "start cpr": {
        "category": "intent",
        "meaning": "Begin chest compressions / rescue breathing",
        "aave": False,
        "type": None,
    },
    "white truck": {
        "category": "vehicle",
        "meaning": "Vehicle description — white pickup truck",
        "aave": False,
        "type": None,
    },
}

# Mock geocoder for the demo: known addresses -> coordinates + clean label.
# In production this would be a real geocoding call. Keys are lowercase.
ADDRESSES = {
    "1420 pine street": {
        "lat": 33.7601,
        "lng": -84.3845,
        "label": "1420 Pine Street, Apt 3B, Atlanta, GA",
    },
}

# Semantic category -> UI color name (the frontend maps these to its palette).
CATEGORY_COLORS = {
    "location": "blue",
    "medical": "green",
    "intent": "purple",
    "vehicle": "yellow",
}
