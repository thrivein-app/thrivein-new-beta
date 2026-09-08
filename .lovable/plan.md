# Passport premium finish

## Goal
Complete the remaining Passport visual overhaul without changing backend behavior.

## Changes
1. Rework the shared Holocard shell with Kretopia’s signal triad, layered foil depth, controlled pointer lighting, reduced-motion support, and sharper card geometry.
2. Restyle the Passport QR to reuse the event-pass proportions, border treatment, spacing, and official Kretopia K mark while preserving copy, download, share, and scan behavior.
3. Replace the circular portrait on the Passport identity surface with the official K mark, using a crisp asset-based treatment at every supported size.
4. Verify the Passport and event-pass views on desktop and mobile, then resolve any type or preview errors.

## Technical notes
- Frontend-only changes; existing URLs, QR payloads, and backend logic remain unchanged.
- Use existing semantic tokens and official CDN-backed brand assets.
- Keep motion optional under `prefers-reduced-motion`.
