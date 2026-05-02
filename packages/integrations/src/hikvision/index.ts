// Hikvision ISAPI event integration.
//
//   • verifyHmac(rawBody, sigHeader, secret)
//       — Hikvision NVRs / HikCentral can sign event-push HTTP listener
//         requests. The header & algo are configurable; we support the
//         common HMAC-SHA256(rawBody, secret) case with the signature in
//         the X-Hik-Signature header (hex).
//   • parseEvent(json)
//       — Normalizes the various ISAPI event payloads (LinkDetect, Smart,
//         Region, Tampering, etc.) into a single TriggerEvent-compatible
//         shape consumable by the dispatch engine.
//   • mapHikEventType(eventType)
//       — Maps Hikvision's eventType strings ('linedetection', 'fielddetection',
//         'intrusion', 'regionEntrance', 'objectremoval', etc.) to the keys
//         used in linkage_rules.event_types.

export { verifyHmac } from './hmac.js';
export { parseEvent, mapHikEventType } from './parse.js';
export { HikRelayClient } from './relay.js';
export type { HikEvent, NormalizedHikEvent } from './parse.js';
