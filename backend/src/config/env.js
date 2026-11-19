const fs = require('node:fs');
const path = require('node:path');
const { IANAZone } = require('luxon');
const { z } = require('zod');

// The .env file sits in the backend folder (ScamSentry/backend/.env), two folders above src/config.
// ENV_FILE can point somewhere else (used by tests and demos).
// Variables that are already set are not overwritten.
const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const secret = z.string().min(32, 'must be at least 32 characters');
const flag = (defaultValue) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');
const positiveInt = (defaultValue) => z.coerce.number().int().positive().default(defaultValue);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: positiveInt(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),

    JWT_SECRET: secret,
    // Key for the HMAC of message text (the verdict cache key) and of IP addresses (the
    // network counter), so neither is stored in a form that can be looked up without it.
    INPUT_HASH_SECRET: secret,
    JOB_TRIGGER_SECRET: secret,
    FRONTEND_URL: z.url(),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),

    // Any OpenAI-compatible chat API: Groq in development, the local stub (e2e/mocks/llm-stub.js) in tests and demos.
    LLM_BASE_URL: z.url(),
    LLM_MODEL: z.string().min(1),
    LLM_API_KEY: z.string().min(1).optional(),
    // Only reasoning models (Groq's gpt-oss) know this setting; leave it out for the others.
    LLM_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).optional(),
    LLM_TIMEOUT_MS: positiveInt(15000),

    // Daily check limits. A "day" is the calendar day in QUOTA_TIME_ZONE for everyone.
    QUOTA_TIME_ZONE: z
      .string()
      .default('Asia/Kolkata')
      .refine((value) => IANAZone.isValidZone(value), 'must be an IANA time zone'),
    GUEST_DEVICE_DAILY_LIMIT: positiveInt(3),
    GUEST_NETWORK_DAILY_LIMIT: positiveInt(10),
    USER_DAILY_LIMIT: positiveInt(30),

    // The report-text purge runs once a day (cron in UTC).
    PURGE_CRON: z.string().min(1).default('15 2 * * *'),
    // Lets the job endpoint run "as if it were" another moment (tests and hand checks only).
    JOB_TIME_OVERRIDE_ENABLED: flag('false'),

    // The login, sign-up and reset limiters. Playwright runs log in many times from one IP,
    // so they turn these off (one pass turns them back on). The daily check quota is a
    // product rule and is never turned off.
    RATE_LIMITS_ENABLED: flag('true'),

    DEMO_MODE: flag('false'),
    DEMO_PASSWORD: z.string().min(8).optional(),

    // Hosting. TRUST_PROXY is Express's "trust proxy": "loopback" (default: the Vite proxy and the
    // Playwright run on this machine) or the number of proxies in front, e.g. 1 on Render, so the
    // per-network guest limit keys on the visitor's IP and not the proxy's.
    TRUST_PROXY: z
      .string()
      .regex(/^(loopback|\d{1,2})$/, 'must be "loopback" or a number of proxy hops')
      .default('loopback')
      .transform((value) => (value === 'loopback' ? value : Number(value))),
    // A folder with the built frontend (frontend/dist). When set, the API also serves the app, so
    // one service is the whole site on one origin (the Docker image sets it).
    STATIC_DIR: z.string().min(1).optional(),

    // Emails to .test addresses (demo and dev accounts) go to this Ethereal inbox, never
    // through Brevo. Without these, every email uses the SMTP_* settings above.
    DEMO_SMTP_HOST: z.string().min(1).optional(),
    DEMO_SMTP_PORT: z.coerce.number().int().positive().optional(),
    DEMO_SMTP_USER: z.string().min(1).optional(),
    DEMO_SMTP_PASS: z.string().min(1).optional(),
    DEMO_SMTP_FROM: z.string().min(1).optional(),
  })
  .refine((values) => values.NODE_ENV !== 'production' || values.RATE_LIMITS_ENABLED, {
    message: 'cannot be false in production',
    path: ['RATE_LIMITS_ENABLED'],
  })
  .refine((values) => values.NODE_ENV !== 'production' || !values.JOB_TIME_OVERRIDE_ENABLED, {
    message: 'cannot be true in production',
    path: ['JOB_TIME_OVERRIDE_ENABLED'],
  })
  .refine((values) => !values.DEMO_MODE || values.DEMO_PASSWORD, {
    message: 'is required when DEMO_MODE=true',
    path: ['DEMO_PASSWORD'],
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Only variable names and rules are printed, never the values.
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

const env = parsed.data;

module.exports = { env };
