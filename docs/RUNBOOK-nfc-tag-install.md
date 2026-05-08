# Runbook — NFC tag installation & commissioning

For the technician installing the **42 Northview patrol tags**. Print this
document, bring it on-site. The companion data file is
[ops/northview/tags.tsv](../ops/northview/tags.tsv) — print it too, you'll
check off rows as you go.

**Time budget:** ~6 hours total. ~90 min in office (program all 42 tags),
~40 min per site for install + verification × 7 sites.

---

## 0. The 60-second mental model

1. Each NFC tag is a **passive sticker** that stores one URL.
2. You write the URL `https://field.stigg.ca/p/<code>` to the tag using a phone.
3. You stick the tag at the matching checkpoint location.
4. When a guard taps the tag, their phone opens that URL → the Stigg field app
   captures GPS + identity + time → records the patrol scan.
5. You **don't** need a Stigg account to write the tags. You **do** need one
   to verify them after install (see §4).

The tag itself does not transmit anything. It's a 30-byte sticker.

---

## 1. Equipment checklist (before leaving)

- [ ] **42 NTAG213 / NTAG215 stickers** (whichever you bought) + **5 spares**
- [ ] **Smartphone** with NFC, charged ≥80%
- [ ] **NFC Tools** app (free)
  - iOS: App Store → "NFC Tools" by wakdev
  - Android: Play Store → "NFC Tools" by wakdev *or* "NXP TagWriter"
- [ ] **Power bank** (cold weather drains battery 2× faster)
- [ ] **Isopropyl alcohol wipes** (70%+) — for surface prep
- [ ] **Microfiber cloth**
- [ ] **Permanent marker** (label spare tags or write codes on backs)
- [ ] **Step ladder** (some tags may be 2m+ high)
- [ ] **Phone case check** — most cases pass NFC through; thick cases or
      cardholders behind the phone block it. Test before leaving.
- [ ] **Building access** — keys, access cards, lobby buzz codes for all 7
      Northview properties. Get these from dispatch *before* leaving.
- [ ] **Signed printout of [tags.tsv](../ops/northview/tags.tsv)** — one copy
      to mark up, one for handover
- [ ] **Camera-ready phone** for install photos (the same phone is fine)

**Cold-weather kit (under +5°C):**
- [ ] Hand warmers in inner pocket — tag adhesive won't bond at low temp
- [ ] Tags pre-warmed in inner pocket (>15°C) before applying
- [ ] **Do not** apply to surfaces colder than +5°C. Indoor tags are fine
      year-round. Outdoor parkade/perimeter tags: warm the surface with
      a hand warmer for 60s if needed.

---

## 2. Office step — program all 42 tags first

**Do this at the office, not on-site.** Programming is fast (~30s per tag)
when batched. On-site you only have to install + verify.

### 2a. App setup (NFC Tools, once)

1. Open NFC Tools.
2. Tap **Other** (top right) → **Settings** → enable:
   - **Auto launch URLs** = OFF (so you can read tags to verify without auto-opening Safari)
   - **Read after writing** = ON (immediately confirms the write)
3. Back to home → **Write** tab.

### 2b. Write one test tag first

1. **Add a record** → **URL/URI** → paste:
   `https://field.stigg.ca/p/TEST`
2. Tap **Write** → hold a tag against the back of the phone.
3. Wait for "Write Complete." Should take 1–2 seconds.
4. Switch to **Read** tab → tap the same tag → confirms the URL.
5. Trash the test tag (or save as a known-good control).

If write fails: phone case is the most common culprit. Try without case.

### 2c. Write all 42 production tags

For each row in `tags.tsv`:

1. **Add a record** → **URL/URI** → paste the URL from the row
   (e.g. `https://field.stigg.ca/p/NW-1001`)
2. Tap **Write** → hold tag → wait for confirmation
3. **CRITICAL: Lock the tag** (so it can't be reprogrammed by an attacker)
   - NFC Tools: **Other** tab → **Lock tag** → confirm
   - Once locked, the URL is permanent. Locking a tag with the wrong URL
     means you throw it out. **Verify the URL on Read tab BEFORE locking.**
4. Mark the row in your printed `tags.tsv` with ✓ for "written + locked"
5. Place the tag in a **labeled section** of your storage so you can find it
   when you're at the matching checkpoint. Suggestion: 7 small zip bags,
   one per site:
   - Bag 1: NW-1001 to NW-1006 → Parkview I
   - Bag 2: NW-2001 to NW-2006 → Parkview II
   - Bag 3: NW-3001 to NW-3006 → 6 Nixon
   - Bag 4: NW-4001 to NW-4006 → 4 Nixon
   - Bag 5: NW-5001 to NW-5006 → 16 Saunderson
   - Bag 6: NW-6001 to NW-6006 → 15 Saunderson
   - Bag 7: NW-7001 to NW-7006 → MacDonald Place

End-of-office check: 42 tags written + locked + bagged. Spares unwritten.

---

## 3. On-site install (per site)

Walk each site in order, taking ~40 minutes. Suggested order (geographically
clustered): Parkview I → Parkview II → 6 Nixon → 4 Nixon → 16 Saunderson →
15 Saunderson → MacDonald.

### 3a. The 6 checkpoints per site (always the same labels)

| Ordinal | Label | Where to install |
|---|---|---|
| 1 | **Front entrance** | On the door frame, inside vestibule, **chest height (1.4m)**, on the strike-plate side. Avoids weather. |
| 2 | **Lobby / mail** | Beside the mailboxes or near the lobby buzzer panel. Same chest height. |
| 3 | **Parking area** | Inside an electrical/utility cabinet door, on the wall facing the parking lot. **Avoid bare metal posts** unless using on-metal tags. |
| 4 | **Stairwell A** | Inside the stairwell at the **ground-floor landing**, on the wall opposite the door so a guard who steps in can tap without searching. |
| 5 | **Laundry room** | On the inside of the laundry room door frame, chest height. If the laundry room is locked, on the lock-side door frame. |
| 6 | **Rear / perimeter** | At the rear exit door frame, inside vestibule. If no rear vestibule, mount on the **inside** of an exit door (so weather doesn't beat on it) at chest height. |

**Universal placement rules:**
- **Chest height (1.2–1.5 m / 4–5 ft).** Consistent. No bending, no reaching.
- **On door-frame metal or plastic, NOT on glass** (glass is brittle, NFC works fine but the tag is destroyed if glass is replaced).
- **Avoid direct sunlight** (UV degrades adhesive over 6+ months).
- **Smooth surface preferred** — wipe with isopropyl, dry, then apply.
- **Press firmly for 30 seconds** after applying. The pressure activates the
  adhesive. Don't just stick and walk.
- **Outdoor / parkade exception:** use **on-metal PET tags** if mounting on
  metal posts/cabinets. Bare PVC tags detune badly on metal.

### 3b. Install procedure per checkpoint

For each of the 6 checkpoints at the site:

1. Walk to the checkpoint location.
2. **Surface prep:** wipe with isopropyl wipe, dry with microfiber.
3. **Verify the tag** — tap it on your phone (NFC Tools, Read tab) and
   confirm the URL ends with the **expected code** for this checkpoint.
   *Don't trust the bag label; trust the actual NDEF read.*
4. **Peel and stick.** Centered on the chosen surface. Press firmly for 30s.
5. **Photograph the installed tag** with the code visible. Frame it so:
   - The tag is in focus
   - The surrounding context (door frame, lobby panel) is visible
   - The code label on the tag is readable
   File this photo as `<code>.jpg` (e.g. `NW-1001.jpg`).
6. **Tap the tag with your phone again.** With NFC Tools' Read tab open it
   confirms the URL still reads correctly after install (no detune from the
   surface).
7. **Mark the row in your printed manifest** with ✓ for "installed + read OK"

### 3c. Field-app verification (after all 6 are installed at this site)

This is the end-to-end test. Do it before you leave the property.

1. Open Safari/Chrome on your phone → `https://field.stigg.ca`.
2. Sign in with the **field-test account** dispatch gave you.
3. The first time, allow:
   - Location (always allow if asked)
   - Notifications (optional)
4. Walk to checkpoint #1 → **physically tap the tag** with your phone (top
   edge of phone for iPhone, back center for Android).
5. The phone should open `https://field.stigg.ca/p/NW-1001` (or whichever
   code) and immediately show one of:
   - ✅ **Confirmed.** (green, with site/checkpoint/time/distance) → success
   - 🟡 **Flagged for review.** → see §6 (Troubleshooting)
6. Repeat for all 6 checkpoints at this site.
7. Take **one screenshot** of any "Confirmed" card per site (proof of
   install). File as `<site-name>-verify.png`.

If any checkpoint fails verification, see §6 before leaving the site.

---

## 4. Per-site placement map (cheat sheet)

Print one of these per site (or hand-draw on the back of `tags.tsv`).
Hand to the guard supervisor at handover so they know where each tag lives.

```
┌────────────────────────────────────────┐
│  PARKVIEW I — INSTALL MAP              │
│                                        │
│  [Lobby Buzzer]      ► NW-1002 LOBBY/MAIL
│        │                               │
│   ┌────▼────┐                          │
│   │ FRONT   │ ► NW-1001 FRONT ENTRANCE │
│   │ DOOR    │   (door frame, inside)   │
│   └─────────┘                          │
│                                        │
│   ┌──────┐    ┌─────────┐              │
│   │STAIR │    │ LAUNDRY │              │
│   │ NW-  │    │  NW-    │              │
│   │ 1004 │    │  1005   │              │
│   └──────┘    └─────────┘              │
│                                        │
│   ┌────────────────┐                   │
│   │ PARKING AREA   │ ► NW-1003         │
│   │ (electrical    │                   │
│   │  cabinet door) │                   │
│   └────────────────┘                   │
│                                        │
│   ┌────────┐                           │
│   │ REAR   │ ► NW-1006                 │
│   │ EXIT   │                           │
│   └────────┘                           │
└────────────────────────────────────────┘
```

The exact mounting spot at each site may vary based on the building. Use
your judgment + the **Universal placement rules** in §3a. Photograph
deviations.

---

## 5. Cold-weather notes (Fort McMurray, year-round)

- **Tag adhesive 3M VHB-equivalent fails below +5°C.** Warm both tag and
  surface to room temp before sticking. Hand-warmer for 60s on each.
- **Phone NFC reading degrades below -25°C.** Below that, keep the phone
  inner-pocket warm and only pull it out at the moment of writing/reading.
- **Battery drains 2× faster below 0°C.** Bring a power bank.
- **Stairwell tags freeze condensation in spring/fall** — pick a spot above
  the expected condensation line (chest height is fine).
- **If a tag won't read after install** in cold weather, warm the surface
  with a hand warmer for 90s and re-tap. If it still fails, replace.

---

## 6. Troubleshooting

What you see in the field app → what it means → what to do.

| Field-app message | Meaning | Action |
|---|---|---|
| **"Confirmed."** (green) | Scan accepted. Recorded in `tour_scans`. | ✅ continue. |
| **"Code … is not a registered checkpoint."** | URL on tag has a typo. | Read the tag with NFC Tools → confirm URL. If wrong: tag is locked, throw it out, write a spare with the correct URL. |
| **"You are 95m from the checkpoint."** | GPS is fine but radius too tight. | Two reasons: (a) installed at wrong site (compare site name in error); (b) GPS drift, walk to a window/outside, retry. |
| **"GPS accuracy ±200m too imprecise."** | Indoor parkade or basement, GPS unusable. | Step outside, retry. If consistent: bump radius for that checkpoint (ask office to update `allowed_radius_m` to 200 for parkade tags). |
| **"No active shift found for this site."** | Field-test account doesn't have a current shift. | Ask dispatch to schedule you a 1-hour shift right now. Retry. |
| **"You are not on shift at … right now."** | Field-test shift is at a different site. | Move to the right site, or ask dispatch to add a shift. |
| **"Scan is outside your scheduled shift window."** | Shift ended (>30min). | Ask dispatch to extend or schedule a new one. |
| **"Already scanned a moment ago."** | You tapped the same tag twice within 60s. | Wait a minute, retry. Or move on — it's already recorded. |
| **Phone doesn't open the URL when tapped** | NFC off, or wrong tap area | iOS: tap the very top edge of the phone. Android: middle of the back. Check NFC is on in Settings. |
| **"Couldn't capture GPS."** | Permission denied or indoor only | iOS Settings → Safari → Location → Allow. Step outside. Retry. |
| **Tag doesn't write** ("Write failed") | Tag locked already, or wrong tag type | Lock check: try another tag. Type check: phone shows tag type on Read tab — must be NTAG213/215/216. |
| **App offline ("Queued offline")** | No mobile signal | Continue installing — it will sync when signal returns. Verify the queue clears once you're back in coverage. |

If a tag is **physically broken** (won't read at all):
1. Use a **spare** from your kit.
2. Write the same URL the broken tag had.
3. Lock it. Install it. Photograph it.
4. Bring the broken tag back; we'll account for it on handover.

---

## 7. Verification dashboard (for the supervisor watching live)

Before you leave the last site, the supervisor can confirm everything you
installed by opening: `https://console.stigg.ca/patrols`

They should see:
- Your test scans appear in the **Patrols** table within ~5 seconds of each tap.
- If anything was flagged (out of range, no shift), it shows up in the red
  **Flagged scans** panel at the top.

Coordinate by phone — when they say "all 42 are showing", you're done.

---

## 8. Handover package

Deliver back to dispatch within 24h of completing install:

- [ ] **Marked-up [tags.tsv](../ops/northview/tags.tsv) printout** with ✓
      against every row (written/locked/installed/verified) and any
      anomalies noted in the margin
- [ ] **Per-tag install photos** — 42 JPGs, named by code (`NW-1001.jpg` etc.)
- [ ] **Per-site verification screenshot** — 7 PNGs of the green "Confirmed"
      card, one per site
- [ ] **Site-by-site install map** (one per site, see §4) — annotated if
      the actual install location differs from the suggestion
- [ ] **Unused spare tags** — count and return
- [ ] **Broken tags** — count, photograph, return for warranty replacement
- [ ] **Sign-off form** (below) — signed and dated

### Sign-off form template

```
Stigg NFC Tag Install — Northview — Sign-off
─────────────────────────────────────────────────
Tech name:        __________________
Date(s) on site:  __________________
Sites completed:  ☐ Parkview I    ☐ Parkview II
                  ☐ 6 Nixon       ☐ 4 Nixon
                  ☐ 16 Saunderson ☐ 15 Saunderson
                  ☐ MacDonald
Tags written:     ___ / 42
Tags installed:   ___ / 42
Tags verified:    ___ / 42
Spares used:      ___    Broken tags: ___
Anomalies (referenced on manifest):
  ____________________________________________________
  ____________________________________________________

Signature: _____________________  Witness: _____________________
```

---

## 9. After this job — what happens next

You don't need to do anything more. From this point:

1. **Guards on shift** start tapping tags during their patrols. The field app
   automatically records each scan with GPS + time + identity.
2. **Supervisors** see live progress in the console (Patrols page).
3. **Property managers** see daily summaries via the client portal.
4. **GPS calibration** — once tags have been used for ~2 weeks, the office
   may dispatch a guard on a "calibration round" to capture per-checkpoint
   GPS coordinates (right now all 6 checkpoints at a site share the
   building's coordinates; the calibration round tightens that).

If you hear about issues post-install (tags not being detected, guards
getting flagged scans), refer them back to dispatch with the
**checkpoint code** of the failing tag — that's enough to debug from the
office without revisiting the site.

---

## 10. Quick reference

**App URL** (for guard verification): `https://field.stigg.ca`
**Console URL** (for supervisors): `https://console.stigg.ca/patrols`
**Tag manifest** (the ground truth): `ops/northview/tags.tsv`
**This runbook**: `docs/RUNBOOK-nfc-tag-install.md`
**Companion technical doc**: `docs/RUNBOOK-nfc-patrol-tags.md`
**Dispatch contact**: ___________________ (fill in)

---

## Appendix A — Why we lock tags

A locked NTAG cannot be reprogrammed. If we don't lock, an attacker could
hold their phone against a tag and rewrite the URL to point somewhere
malicious. Their replacement URL would be hit by the next guard who taps it.

Locking the tag with the correct URL prevents this entire class of attack.
The tradeoff: if we ever need to change the URL on the tag (rebrand
`field.stigg.ca` to something else), we have to physically replace every
tag. We accept that — security wins.

The Stigg server-side validation (GPS + shift + radius) is the second line
of defense. Even an unlocked, cloned, or moved tag can't generate a fake
patrol record because the server checks the guard's actual location and
shift assignment at the moment of the tap.

## Appendix B — When to re-do a tag

You have to peel and replace a tag if any of these are true:

- Tag adhesive failed and it fell off
- Tag was tampered with (cut, defaced, drilled)
- The URL on the tag is wrong (rare; verify on Read tab before locking)
- The site has been renumbered or the route restructured
- Building renovation moved the install location

In all cases, **bring the old tag back** so the office can mark the code
as deprecated in the database. Don't leave a removed tag in the trash on
site — chain of custody matters.
