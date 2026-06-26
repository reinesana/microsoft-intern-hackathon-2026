"""Fallback 911 scenario used by the standalone CLI (main.py). The web app
streams real transcribed audio instead.
"""

# Initial map view (downtown Atlanta) before any address is extracted.
SCENARIO = {
    "id": "covert-domestic",
    "title": "Disguised Call — Caller May Not Be Able to Speak Freely",
    "center": {"lat": 33.749, "lng": -84.388},
    # Mock EMS units shown on the map near the scene.
    "ems_units": [
        {"id": "MEDIC-7", "lat": 33.7705, "lng": -84.3960, "status": "Available"},
        {"id": "ENGINE-12", "lat": 33.7520, "lng": -84.3750, "status": "Available"},
    ],
    # speaker is "Dispatcher" or "Caller"; t is the seconds offset of the line.
    "lines": [
        {"id": 1, "t": 0, "speaker": "Dispatcher", "text": "9-1-1, where's your emergency?"},
        {"id": 2, "t": 3, "speaker": "Caller", "text": "My son just fell out! He dropped right here."},
        {"id": 3, "t": 6, "speaker": "Dispatcher", "text": "What's the address?"},
        {"id": 4, "t": 8, "speaker": "Caller", "text": "1420 Pine Street, apartment 3B."},
        {"id": 5, "t": 11, "speaker": "Caller", "text": "He ain't breathin' right and he won't come to."},
        {"id": 6, "t": 14, "speaker": "Dispatcher", "text": "Is he awake?"},
        {"id": 7, "t": 16, "speaker": "Caller", "text": "Naw, he still out. His sugar been low all day."},
        {"id": 8, "t": 19, "speaker": "Caller", "text": "I'm finna start CPR like they showed me."},
        {"id": 9, "t": 22, "speaker": "Dispatcher", "text": "Good — help's on the way."},
        {"id": 10, "t": 24, "speaker": "Caller", "text": "Tell 'em hurry, a white truck blockin' the driveway."},
    ],
}
