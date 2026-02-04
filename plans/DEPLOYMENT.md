---
# CareFlow Deployment (Concise)

## Target Platform

Vercel (recommended). Ensure all environment variables are configured before deploying.
---

## Steps

1. **Push to GitHub**
2. **Create Vercel project** (framework: Next.js)
3. **Set environment variables** from [`careflow/.env.local.example`](careflow/.env.local.example)
4. **Deploy**
5. **Update Twilio webhooks** to the deployed domain
6. **Add Firebase authorized domain**

---

## Twilio Webhook URLs

- Voice: `https://your-domain.vercel.app/api/webhooks/twilio/voice`
- Status: `https://your-domain.vercel.app/api/webhooks/twilio/status`

---

## Troubleshooting

- Validate server-side env vars exist in Vercel.
- Check function logs for API/webhook failures.
- Ensure Twilio webhooks are public and correct.

---

## Local vs Production

- Local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Prod: `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`
