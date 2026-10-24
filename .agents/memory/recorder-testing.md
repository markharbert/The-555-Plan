---
name: Recorder testing environment
description: Browser-runner limitations when validating real private recordings.
---

The browser runner can report no camera or microphone even when fake-device launch flags are requested. Contexts labeled Firefox, WebKit, or Edge may still use the same Chromium engine. Do not treat a requested browser name as proof of browser coverage.

**Why:** During recorder verification, enumeration returned no devices and alternate browser contexts all reported Chromium. An animated canvas plus an AudioContext destination supplied usable synthetic camera input while keeping the real MediaRecorder, IndexedDB, and metadata API in use.

**How to apply:** When hardware is unavailable, use test-only synthetic MediaStreams, not a mocked recorder or app authentication bypass. Check actual browser engine identity and disclose coverage limits. A synthetic recording verifies storage and playback behavior, not native camera permissions or native Safari compatibility.
