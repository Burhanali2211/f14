# AirSend Feature: Problems, Edge Cases & Production Fixes

A comprehensive analysis of the AirSend P2P file transfer feature, covering major problems, edge cases, and production-level fixes.

## IMPLEMENTED FIXES (Latest)

- **Connection robustness**: TURN server support (env: `VITE_AIRSEND_TURN_*`), increased timeouts (180s connection, 120s disconnected grace), 60s buffer drain
- **Session persistence**: Mobile stores session in sessionStorage; refresh keeps same session; receiver resets to "waiting" when peer disconnects
- **Session expiry**: Auto-refresh when session expires; 8-char session codes
- **Data integrity**: Reject on size mismatch; metadata validation; filename sanitization
- **Transfer cancel**: `cancelSend()` on mobile during transfer
- **Use Now fix**: Pass `AirSendFile` directly to callback (no blob URL race)
- **Race guard**: `createSession` lock prevents duplicate sessions
- **Expired sessions cleanup**: `cleanup_expired_airsend_sessions()` SQL function (run via cron)

---

## 1. MAJOR PROBLEMS

### 1.1 Security & Authorization

| Problem | Severity | Description |
|---------|----------|-------------|
| **Open RLS on `airsend_sessions`** | Critical | RLS policy `Allow all for airsend` has `qual: true, with_check: true` — anyone can create, read, update, delete any session. No authentication required. |
| **Session code guessability** | High | 6-char alphanumeric (32 chars) = 32^6 ≈ 1B combinations. Brute-force feasible. No rate limiting. |
| **Browse Active Sessions exposes all** | High | `AirSendMobilePage` lists all pending sessions. Anyone can see and connect to any active session without the QR code. |
| **No session ownership** | Medium | Sessions are not tied to any user. No audit trail of who created/used sessions. |

**Fixes:**
- Add RLS: allow insert/select only for anon (or require auth for creation)
- Rate limit session creation (e.g., 5 per IP per hour)
- Use longer session codes (8–10 chars) or UUIDs
- Remove or restrict "Browse Active Sessions" — require session code or QR scan only
- Add `created_by` (user_id) and `client_ip` for audit

---

### 1.2 WebRTC / P2P Connection

| Problem | Severity | Description |
|---------|----------|-------------|
| **No TURN server** | Critical | Only STUN (Google). Symmetric NAT, strict firewalls, corporate networks often block direct P2P. Connection will fail for many users. |
| **ICE restart doesn't recreate DataChannel** | High | On `request-restart`, sender calls `restartIce()` but receiver gets new `ondatachannel` — sender's `dataChannel` stays closed. Protocol desync. |
| **Connection timeout too short for file picker** | Medium | 120s may be tight when user browses files. No user feedback that timeout is approaching. |
| **Buffer drain timeout (30s)** | Medium | If network is slow, `bufferedamountlow` may never fire in 30s → "Buffer drain timeout" and transfer fails. |
| **Retry without exponential backoff** | Low | Fixed 15 retries, no backoff. Can hammer signaling server. |

**Fixes:**
- Add TURN server (e.g., Twilio, Xirsys, or self-hosted coturn) for production
- On ICE restart: sender must recreate DataChannel and re-send offer
- Make connection timeout configurable; show countdown in UI
- Increase buffer drain timeout or make it adaptive (e.g., 60s for large files)
- Add exponential backoff for retries (e.g., 1s, 2s, 4s, …)

---

### 1.3 Data Integrity & Protocol

| Problem | Severity | Description |
|---------|----------|-------------|
| **Size mismatch only logs warning** | High | If `blob.size !== fileMetadata.size`, code logs warning but still delivers file. Corrupt/incomplete file accepted. |
| **No checksum/hash verification** | High | No integrity check. Corrupted chunks are undetected. |
| **Metadata JSON not validated** | Medium | Malformed metadata can throw and crash receiver. No schema validation. |
| **Dangerous file names** | Medium | No sanitization. Names like `../../../etc/passwd` or very long names can cause issues. |
| **Single-file protocol** | Low | One file per transfer. "Send Another" requires new connection flow. |

**Fixes:**
- Reject transfer if `blob.size !== fileMetadata.size`; optionally support retry
- Add optional hash (e.g., SHA-256) in metadata; verify on receive
- Validate metadata: required fields (name, type, size), max lengths, safe chars
- Sanitize filenames: strip path components, limit length, allow safe charset
- Document single-file limitation; consider multi-file protocol for future

---

### 1.4 Memory & Performance

| Problem | Severity | Description |
|---------|----------|-------------|
| **Full file in memory** | Critical | `file.arrayBuffer()` and `receivedChunks` hold entire file. 500MB file = 500MB+ RAM. Mobile devices can OOM. |
| **No streaming/chunked processing** | High | Receiver accumulates all chunks in array, then creates Blob. No streaming to disk. |
| **Large ArrayBuffer allocations** | Medium | Single `blob.arrayBuffer()` for full file — can fail on low-memory devices. |

**Fixes:**
- For large files (>50MB): stream to disk (File System Access API, IndexedDB, or temporary blob URL + download)
- Consider lower default MAX_FILE_SIZE on mobile (e.g., 50MB)
- Use `ReadableStream` + `WritableStream` where supported
- Warn user before sending files >100MB

---

### 1.5 UI/UX & State

| Problem | Severity | Description |
|---------|----------|-------------|
| **Session expires while dialog open** | High | `expiresIn` counts down but no action when it hits 0. Session invalid, QR useless, user not informed. |
| **Race in createSession** | Medium | Rapid open/close can trigger multiple `createSession` calls; possible duplicate sessions. |
| **Blob URL revoked too early** | Medium | `onAudioReceived(receivedUrl, fileName)` — if `handleClose` runs first, URL may be revoked before ImageSegmentEditor uses it. |
| **"Use Now" closes dialog** | Low | `handleClose()` revokes blob URL. Caller may still need it. |
| **No transfer cancellation** | Medium | User cannot cancel in-flight transfer. |

**Fixes:**
- When `expiresIn` hits 0: show "Session expired", auto-refresh or prompt to create new session
- Debounce or guard `createSession` with a flag/lock
- Don't revoke blob URL until caller confirms use, or pass File/Blob instead of URL
- Add "Cancel" during transfer; call `destroy()` and reset state

---

### 1.6 Database & Types

| Problem | Severity | Description |
|---------|----------|-------------|
| **`piece_id` type mismatch** | Medium | `airsend_sessions.piece_id` is `text`; `pieces.id` is `uuid`. Foreign key missing; invalid IDs possible. |
| **Orphan sessions** | Low | Sessions never cleaned up when expired. Table grows. |
| **No `updated_at` trigger** | Low | Heartbeat updates `updated_at` manually; easy to forget in other flows. |

**Fixes:**
- Change `piece_id` to `uuid` and add FK to `pieces(id)` if applicable
- Add cron/scheduled job to delete expired sessions (e.g., `expires_at < now()`)
- Use `updated_at` default/trigger for consistency

---

## 2. EDGE CASES NOT HANDLED

### 2.1 Network & Environment

| Edge Case | Impact | Fix |
|-----------|--------|-----|
| **Symmetric NAT** | Connection fails | TURN server required |
| **Corporate firewall blocks WebRTC** | Connection fails | Fallback: show "WebRTC blocked" and suggest alternative (e.g., upload via web) |
| **WiFi → cellular handoff** | Connection drops | Detect and surface "Network changed"; prompt to reconnect |
| **Offline after scan** | Mobile goes offline before transfer | Check connectivity; show "Offline" state |
| **Very slow network** | Buffer never drains | Increase timeout; consider chunk size reduction |

---

### 2.2 Browser & Device

| Edge Case | Impact | Fix |
|-----------|--------|-----|
| **Safari WebRTC quirks** | Different behavior, possible failures | Test on Safari; add Safari-specific workarounds |
| **Mobile browser backgrounded** | Connection suspended/dropped | Use Page Visibility API; show "Return to app" when visible again |
| **Tab throttling** | Transfer stalls when tab in background | Warn user to keep tab active for large transfers |
| **No `showDirectoryPicker`** | Can't save to folder | Already falls back to blob URL + download; ensure download works in all target browsers |
| **Private/incognito** | sessionStorage cleared on close | Session lost on tab close; document behavior |

---

### 2.3 Concurrency & Protocol

| Edge Case | Impact | Fix |
|-----------|--------|-----|
| **Two devices scan same QR** | Both connect; undefined behavior | Only one DataChannel per session; second connection should replace first or be rejected |
| **Sender sends before receiver ready** | Chunks lost | Protocol already has receiver "ready" first; ensure sender waits for "Channel open" |
| **Multiple METADATA without END** | Protocol allows multiple files? | Current code resets state on METADATA; clarify if multi-file is supported |
| **END without METADATA** | `fileMetadata` null | Guard: `if (!fileMetadata) return;` before processing END |
| **Transfer interrupted mid-chunk** | Partial file delivered | Add END verification; reject if incomplete |

---

### 2.4 File & Content

| Edge Case | Impact | Fix |
|-----------|--------|-----|
| **Empty file (0 bytes)** | Handled | Already supported |
| **File type mismatch (ImageSegmentEditor)** | User sends image; told "audio required" after transfer | Validate file type on sender (mobile) when `pieceId` present; reject before transfer |
| **Unicode filenames** | Encoding issues | Use UTF-8 in metadata; test with non-ASCII names |
| **Very long filename** | UI/DB issues | Enforce max length (e.g., 255 chars) |
| **Executable / malicious file** | Security risk | Consider blocklist (e.g., .exe, .bat) or allowlist for audio mode |

---

### 2.5 Session & Lifecycle

| Edge Case | Impact | Fix |
|-----------|--------|-----|
| **Receiver closes dialog during transfer** | `destroy()` called; sender gets error | Handle `destroyed` in send loop; show "Receiver disconnected" on sender |
| **Receiver refreshes page** | New session; old session orphaned | Clean up old session on refresh; mobile may need to re-scan |
| **Session deleted by receiver** | Mobile still thinks session valid | Poll or subscribe to session existence; show "Session ended" |
| **Clock skew** | `expires_at` wrong | Use server time for expiry check |
| **Duplicate session code** | Collision (rare with 6 chars) | Use UUID for session_code; display short code for QR |

---

## 3. PRODUCTION FIXES CHECKLIST

### Critical (Must Fix)

- [ ] Add TURN server for WebRTC
- [ ] Fix ICE restart / DataChannel recreation on sender
- [ ] Restrict RLS on `airsend_sessions` (e.g., anon insert/select only; no public delete)
- [ ] Reject transfer on size mismatch
- [ ] Add memory safeguards for large files (streaming or lower mobile limit)
- [ ] Handle session expiry in UI (refresh or prompt)
- [ ] Remove or restrict "Browse Active Sessions"

### High Priority

- [ ] Add metadata validation and safe filename handling
- [ ] Optional checksum verification
- [ ] Fix blob URL lifecycle for "Use Now"
- [ ] Add transfer cancellation
- [ ] Increase buffer drain timeout or make adaptive
- [ ] Fix `piece_id` type (uuid + FK)

### Medium Priority

- [ ] Rate limit session creation
- [ ] Longer session codes or UUID
- [ ] Exponential backoff for retries
- [ ] Cleanup job for expired sessions
- [ ] Validate file type on sender when in audio mode
- [ ] Guard `createSession` against races

### Nice to Have

- [ ] WebRTC connectivity check before showing QR
- [ ] Page Visibility handling for backgrounded tabs
- [ ] Safari-specific testing and fixes
- [ ] Audit fields (created_by, client_ip)

---

## 4. QUICK REFERENCE: FILE LOCATIONS

| File | Purpose |
|------|---------|
| `src/lib/airsend-p2p.ts` | Core WebRTC P2P logic |
| `src/lib/airsend-constants.ts` | Session expiry, storage, URL helpers |
| `src/components/media/AirSendDialog.tsx` | Desktop receiver UI |
| `src/pages/AirSendMobilePage.tsx` | Mobile sender UI |
| `src/components/media/AirSendQrScanner.tsx` | QR code scanner |
| `src/integrations/supabase/airsend-client.ts` | Supabase client for signaling |
| `airsend_sessions` table | Session registry (Supabase) |

---

## 5. RECOMMENDED IMPLEMENTATION ORDER

1. **Security**: RLS, rate limiting, session code strength
2. **Reliability**: TURN server, ICE restart fix, size mismatch rejection
3. **Stability**: Memory limits, buffer timeout, session expiry UI
4. **UX**: Transfer cancel, blob URL fix, file type validation on sender
5. **Maintenance**: Expired session cleanup, metadata validation, logging
