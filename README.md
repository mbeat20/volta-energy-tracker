# Volta — take-home exercise

Welcome, and thanks for making the time. **Everything you need is in this file.** Read it all
before you start.

**Timebox: 4–6 hours.** We do not expect you to finish everything below. We would far rather see a
smaller slice done well, understood completely, than everything half-working. Stop when your time
is up and tell us where you got to.

---

## What Volta is

Volta helps energy customers understand what they're using. A **member** owns one or more
**meters**. Meters produce **readings** — a cumulative number, like the odometer in a car. The
difference between two consecutive readings is the **usage** for that stretch of time.

Every night an upstream system drops a CSV of readings. Your job is to take that file, make sense
of it, store it, and expose it.

> **The file is real-world messy.** It comes from smart meters, meter-reader visits and customers
> typing numbers into an app, and it shows. Some rows are wrong in ways you should reject, some are
> wrong in ways you can repair, and some only _look_ wrong. Working out which is which is a large
> part of this exercise.

---

## What's already here

A bare monorepo. Both apps start and talk to each other, and that's deliberately all they do — the
design is yours.

```
apps/api              Express + TypeScript. One /health endpoint, a Postgres pool in src/db.ts,
                      and Vitest set up with one placeholder test.
apps/web              React + Vite + TypeScript. One page that calls /health.
seed/                 Your input data (see below).
docker-compose.yml    Postgres.
.env.example          Ports and connection strings. Copy it to .env (see below).
.prettierrc           Formatting. Run `pnpm format` before you commit if you like.
AI_NOTES.md           For you to fill in.
SOLUTION.md           For you to fill in.
```

There is no schema, no migration, no CSV handling and no data model. None of that is an oversight.

For context, we use **Prisma** as our ORM against Postgres, so you're very welcome to reach for it
here. Raw SQL or a query builder is equally fine — we're not assessing ORM knowledge, and we've
deliberately not set one up because how you model this data is part of what we're interested in.
(`apps/api/src/db.ts` is just a plain `pg` pool to save you a step; delete it if you'd rather not
use it.)

### The seed data

| File                | What it is                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `seed/readings.csv` | The nightly drop. ~110 rows. This is the messy one.                                                 |
| `seed/meters.json`  | 12 meters — which member owns them, fuel type, unit, install date, and whether the meter is public. |
| `seed/members.json` | 10 members.                                                                                         |

`readings.csv` columns: `reading_id`, `meter_id`, `taken_at`, `value`, `source`, `verified`.

---

## Getting it running

**Start by making your own copy.** On GitHub, click **Use this template** → **Create a new
repository**, and do all of your work in that new repo. Please don't push to this repo or open pull
requests against it — it needs to stay exactly as it is.

You'll need Node 20+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env
pnpm db:up        # starts Postgres on localhost:5432, and waits until it's ready
pnpm dev          # starts the API on :3000 and the web app on :5173
```

Open http://localhost:5173 — it should say the API is connected. If it does, you're set up.

Other commands:

```bash
pnpm test         # Vitest, in apps/api
pnpm typecheck
pnpm format       # Prettier
pnpm db:down      # stops Postgres
```

Database credentials are in `docker-compose.yml`.

---

## What to build

Nobody has written you a spec, and we're not going to. Here's who needs what:

- **The data team** want to know what happened to last night's file — what landed, what didn't,
  and why — without opening the CSV themselves.
- **A member** wants to see what they've used, and whether they're over the **250 kWh allowance**
  for the period.
- **A member** sometimes wants to show one of their meters to someone else — a landlord, a
  housemate — without that person having an account. Some meters are already flagged for this in
  `meters.json`; most aren't, and that distinction should mean something.

How you serve those is your call: the endpoints, the data model, the shape of it. Three things we
do need, because otherwise we can't assess it:

- it runs against `seed/readings.csv` and persists to **Postgres**,
- a human can see a meter's usage in the web app,
- `SOLUTION.md` and `AI_NOTES.md` are filled in.

### Worth knowing

- **Re-running the ingest is something that will happen**, repeatedly, in real life.
- **Vitest is set up** in `apps/api` (`pnpm test`). We're interested in _what you chose to test_,
  not how much you covered.
- There's more in this problem than fits in 4–6 hours. Choosing what to leave out is part of the
  exercise — just tell us what you chose and why.

### Don't spend time on

- **Real auth.** You'll need some way to know who's asking; a request header is plenty. No signup,
  no login, no password handling.
- **Styling.** See below.
- **Frontend tests.** The web app has no test runner and doesn't need one.
- Deployment, Docker for the apps, CI, or exhaustive coverage.

### About styling — we mean it

We are not assessing how it looks. Not the layout, not the colours, not the CSS. Plain black text
on a white background is a perfectly good answer. Every candidate reads this line and spends two
hours on it anyway; please don't.

What we do notice is whether a page tells you when it's loading and when something has gone wrong.
That isn't styling, that's whether the thing works.

---

## Some of this brief is deliberately incomplete

There are questions below the surface of the requirements above that we have not answered. Some of
them change your output materially depending on which way you go.

**This is intentional, and it's one of the things we're most interested in.** We are not trying to
catch you out — we're interested in whether you notice that a decision _is_ a decision.

When you hit one:

- pick whichever option you can justify,
- write it down in `SOLUTION.md` with your reasoning,
- carry on.

There is no right answer, and you won't be marked against a preferred one. Noticing and recording
the choice scores; silently guessing does not. If something genuinely blocks you, email us — asking
a good question is a positive signal here, not a negative one.

---

## Using AI

**Use whatever AI tooling you normally use.** Claude, ChatGPT, Gemini, Copilot, Cursor, whatever
your setup is. That's how the job works and we'd be surprised if you didn't. We're not testing
whether you can write TypeScript from memory.

What we care about:

- Can you get to something that actually works, end to end?
- **Do you understand what ended up in your repo?** We'll ask you to explain code, predict what it
  does before running it, and change it while we watch. "The AI wrote it" is a perfectly normal
  origin story; "I don't know what it does" is the problem.
- Do you notice when it's wrong, and how?

Keep `AI_NOTES.md` as you go, including **some of the actual prompts you used**. Genuinely — paste
them in. The ones that went wrong are more interesting to us than the ones that went right.

---

## Source control

- Commit as you go, in small commits with messages that say what changed and why. We read the
  history — it's how we see the shape of the work, including the wrong turns.
- Don't rewrite it into something tidier at the end. We'd rather see the real thing.
- Don't commit `.env` or any secrets.

---

## What happens next

Send us a link to your repo. We'll read it, run it, and then book a **60-minute session**:

- a short walkthrough where you show us what you built and how it hangs together,
- then we work in the code together — a small change and a bug to chase, with your AI tools on and
  encouraged, exactly as you'd normally work,
- then your questions for us.

It's a working session, not a test. Thinking out loud is the whole point, and **"I don't know" is a
completely fine answer**.
