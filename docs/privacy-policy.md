# Privacy Policy for Collecta

**Effective date:** 2026-05-26
**Last updated:** 2026-05-26

This Privacy Policy describes how the Collecta mobile application ("Collecta", "the app", "we", "us") collects, uses, and shares information when you use it. By using Collecta you agree to the practices described here.

## 1. Information we collect

### Account information

- **Email address** — required to create an account; used for authentication and password recovery.
- **Display name** — chosen by you, visible to other users.

### Content you create

- **Photos** — each "find" you photograph is uploaded to our servers and, by default, visible to other Collecta users.
- **Descriptions and reactions** — text you attach to your finds and reactions you leave on others' finds.
- **Approximate location of finds** — if you grant location permission, the GPS coordinates of where a photo was taken are attached to the find and shown on the map. Location auto-tagging can be disabled in **Settings → Capture → Auto-tag location**.

### Device-related data

- **Push notification token** — if you enable push notifications, your device's push token is stored so we can deliver notifications. Disabling notifications removes the stored token.
- **App preferences** — theme, language, and other settings are stored locally on your device (MMKV) and are not transmitted to our servers.

### What we do **not** collect

- We do not collect advertising identifiers (IDFA, AAID).
- We do not use third-party analytics or advertising SDKs.
- We do not collect crash reports automatically.
- We do not access your contacts, calendar, microphone, or any on-device data beyond what is explicitly listed above.

## 2. How we use information

- **To provide the service** — store your account, sync your finds across devices, render them on the feed and map.
- **To validate finds with AI** — when you submit a photo, the image and the collection criteria are sent to Anthropic's Claude Vision API for content-matching analysis. The verdict (match/no-match plus a confidence score) is stored alongside your find. Per Anthropic's API data policy, content sent through the API is not used to train Anthropic's models and is retained only briefly for abuse monitoring. You can disable AI validation in **Settings → Capture → AI verification**.
- **To enable social features** — display your finds to other users, allow reactions, and surface trending finds in the feed.

## 3. Who we share information with

| Recipient                     | Data shared                                  | Purpose                |
| ----------------------------- | -------------------------------------------- | ---------------------- |
| Supabase (database + storage) | All account data, photos, find metadata      | Backend infrastructure |
| Anthropic (Claude Vision API) | Submitted photos + collection criteria       | AI validation of finds |
| Google (Maps SDK for Android) | Device location while the map screen is open | Render the map         |
| Expo Push Service             | Push notification token (no message content) | Deliver notifications  |

We do **not** sell your personal data. We do **not** share data with advertisers.

## 4. Data storage and retention

- Account data, find metadata, and photos are stored on Supabase infrastructure (EU region, hosted on AWS, GDPR-compliant).
- We retain your data while your account is active.
- When you delete your account, all associated finds, photos, reactions, and metadata are removed within 30 days. Backups may retain data for up to 90 days before being overwritten.

## 5. Your rights

You can:

- **Access** your data — all data we hold about you is visible inside the app.
- **Edit or delete** individual finds — via the find detail screen.
- **Delete your account** — via **Settings → Account → Delete account**, or by emailing us. Deletion is permanent and irreversible.
- **Request a copy of your data** — by emailing us at the address below.

If you reside in the EU, UK, or another jurisdiction granting equivalent rights, you also have the rights of access, rectification, erasure, portability, restriction, and objection under GDPR (and the right to lodge a complaint with a supervisory authority).

If you reside in California, you have the rights under CCPA to know what personal information we collect, to request deletion, and to opt out of the "sale" of personal information — we do not sell personal information.

## 6. Children's privacy

Collecta is not directed to children under 13 (or under 16 in the EEA). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete the relevant account.

## 7. Security

We use industry-standard practices:

- TLS 1.2+ for all data transmitted between the app and our servers.
- Encryption at rest for photos (Supabase Storage) and database content (Postgres at-rest encryption).
- Row-level security on database tables — users can read and modify only their own data, except where content is explicitly public (e.g. finds visible in the social feed).

No method of transmission over the internet or method of electronic storage is 100% secure. We cannot guarantee absolute security.

## 8. International data transfers

Your data may be processed in countries outside your country of residence. Our backend (Supabase) operates from the EU. Some third-party processors (Anthropic, Google, Expo) operate primarily from the United States. Where applicable, we rely on Standard Contractual Clauses or equivalent safeguards for international transfers.

## 9. Changes to this Privacy Policy

We may update this policy from time to time. Material changes will be reflected in the "Last updated" date above and announced in-app. Continued use of Collecta after a change indicates acceptance of the updated policy.

## 10. Contact

For questions, data access requests, or account deletion:

**Yauheni Horbach**
Email: horbachevgen@gmail.com
