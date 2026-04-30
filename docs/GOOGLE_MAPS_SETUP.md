# Google Maps API — Setup Guide

This guide walks you through creating a Google Maps API key, enabling the required APIs, and setting quotas so you never pay more than $0.

---

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top-left and select **New Project**
4. Name it (e.g., `googlemapsroute`) and click **Create**
5. Wait a few seconds, then select the new project from the dropdown

---

## 2. Enable Billing

1. Go to [Billing → Manage billing accounts](https://console.cloud.google.com/billing)
2. Click **Create billing account** (or link an existing one)
3. Enter your payment details
4. Link the billing account to your project

> **Note:** Google gives **$200/month in free credits**. The APIs used by this project are well within the free tier for casual usage.

---

## 3. Enable the Required APIs

You need 3 APIs. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library) and search for each:

| API | Purpose | Free tier (per month) |
|---|---|---|
| [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) | Renders the map | 28,000 loads |
| [Directions API](https://console.cloud.google.com/apis/library/directions-backend.googleapis.com) | Calculates car routes | 40,000 requests |
| [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com) | Converts addresses to coordinates (for planes) | 40,000 requests |

Click each API and press **Enable**.

---

## 4. Create an API Key

1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create credentials → API key**
3. Copy the key (starts with `AIza...`)
4. Paste it into the `index.html` script tag:

```html
<script src="https://maps.googleapis.com/maps/api/js?v=3&libraries=geometry&key=YOUR_KEY_HERE" type="text/javascript"></script>
```

---

## 5. Restrict the API Key

On the same [Credentials page](https://console.cloud.google.com/apis/credentials), click your newly created key:

### Application restrictions

1. Select **HTTP referrers (web sites)**
2. Add:
   - `http://localhost/*`
   - `http://localhost:*/` (for any port)
   - `http://127.0.0.1:*`
3. When deploying to production, add your domain:
   - `https://your-domain.com/*`

### API restrictions

1. Select **Restrict key**
2. Check only these 3 APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
3. Click **Save**

---

## 6. Set Quota Hard Caps

This is the most important step. Even if someone gets your key, quotas prevent any charges.

Go to [IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)

For each API below, search for it, click it, and edit the quota:

| Quota Name | Recommended Limit | Why |
|---|---|---|
| `Maps JavaScript API: Map loads` | 500 / day | Enough for 500 visits per day |
| `Directions API: Requests per day` | 200 / day | Each "Go!" click with 4 cars = 4 requests |
| `Geocoding API: Requests per day` | 200 / day | Each plane = 2 requests (from + to) |

**How to edit a quota:**
1. Search for the quota in the table
2. Check the box next to it
3. Click **Edit quotas**
4. Enter the new limit
5. Submit the request (Google usually approves within minutes)

> After the limit is reached, requests fail with `OVER_QUERY_LIMIT`. The app should detect this and show a friendly message (see [Ticket 010](./tickets/010-handle-quota-exhaustion-byok.md)).

---

## 7. Set Budget Alerts

Go to [Billing → Budgets & alerts](https://console.cloud.google.com/billing/budgets)

1. Click **Create budget**
2. Set amount: **$1** (you'll never reach this if quotas are correct, but this is a backup)
3. Set alert thresholds:
   - **50%** ($0.50) — email notification
   - **100%** ($1.00) — email notification
4. Click **Create**

---

## 8. Test It

1. Open `index.html` in a browser (or serve it via a local HTTP server)
2. Click "Go!" with a few cars
3. Verify:
   - Map renders (no watermark means the key is valid)
   - Cars animate along routes
   - Planes fly in straight lines
   - No console errors

---

## Quick Links

- [APIs & Services Dashboard](https://console.cloud.google.com/apis/dashboard)
- [Credentials](https://console.cloud.google.com/apis/credentials)
- [Quotas](https://console.cloud.google.com/iam-admin/quotas)
- [Budgets & alerts](https://console.cloud.google.com/billing/budgets)
- [APIs Library](https://console.cloud.google.com/apis/library)
