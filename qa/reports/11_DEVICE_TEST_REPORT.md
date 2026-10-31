# TANKR — Mobile Device & Manual QA Report

**Document ID:** `QA-REP-11-DEVICE`  
**Date:** 2026-10-31  

---

## 1. Verified Viewports & Runtimes

| Target | Viewport / Dimensions | Status | Observations |
|---|---|---|---|
| **Mobile Browser / Web** | 390 x 844 (iPhone 14 / 15 Pro equivalent) | **VERIFIED** | Touch targets >= 48px, bottom navigation respects safe areas |
| **Desktop Web Container** | 1920 x 1080 (Chrome / Safari / Firefox) | **VERIFIED** | Centered 440px mobile canvas against dark slate backdrop; map tiles properly centered |
| **Tablet / iPad Viewport** | 768 x 1024 (iPad Mini / Air) | **VERIFIED** | Mobile frame centered with appropriate diffuse box shadows |
| **Physical iOS / Android** | Physical hardware devices | **NOT EXECUTED** | Physical hardware tethering unavailable in local CLI session; marked NOT EXECUTED per testing rule 20 |

---

## 2. Interactive Usability Observations

- **Map Tiles:** OpenStreetMap tiles render quickly without watermarks. Markers position cleanly at user location and nearby tanker coordinates.
- **Bottom Sheet Interactions:** Draggable handle transitions smoothly between collapsed and expanded states without overlapping the bottom navigation bar.
- **PIN Privacy:** Verified that 4-digit PIN is strictly masked on list cards and only displayed inside the active live tracking view.
