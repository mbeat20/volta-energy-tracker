# Solution notes

Your write-up. Keep it short — bullets are fine. This is read closely, so don't skip it.

---

## How to run anything you added

1. pnpm db:migrate - creates the tables defined in apps/api/sql/001_schema.sql.
2. pnpm db:seed - loads members.json and meters.json. Upserts, so it is safe to re-run.
3. pnpm db:ingest - loads readings.csv into the readings table. Safe to re-run
After running these, run pnpm dev, then open the localhost:5173 and choose any meter to see the readings. pnpm test runs the tests for the rules, usage and allowance. None of them need the database. No new env vars.

---

## Decisions I made, and what I traded away

Rules were made seperate from the ingest. There is a function called `rules.ts` that handles one row at a time. The cost here is that the cross-logic, such as duplicates, same ID with different values, live in ingest.ts.

Usage is calculated on request and not stored. Advantage is that the value can't drift with different readings, but must be worked out each and every time.

There is one transaction when ingesting and there is an upsert on reading_id. What it gives us is that we are able to re-run it safely. What I gave up is that if one row breaks the constraint, the whole file will fail instead of the row.



---

## Questions the brief didn't answer

Allowance period wasn't defined. I defined it as one week, the time between consecutive readings. 'Over' means the period usage was over 250kwH. For periods longer than 7 days, the values are not checked against the weekly allowance.

I wasn't sure if gas should be converted to kwH. British Gas gives this exact formula: How to convert gas m³ to kWh (https://www.britishgas.co.uk/business/help-and-support/connections-meters-readings/convert-gas-m3-to-kwh). I converted the values ot KwH to measure usage and allowance on an equivalent scale.

There were a few cases where there was the same reading_id, but with different values. I decided that the later line in the file wins and the earlier one superseded. It is likely the the value later in the file in the day is a correction or more accurate.
* I realised a mistake here, I assumed that the later reading was higher in all cases. A better approach may have been to flag these for a human to check than pick one.

Assumed that the meter maximum value could only have been 99999.99. One of the meters goes from 99991.25 to 10.00 the next reading. Assumed this meant that the period hit 99999.99 then started from 0 to 10.00.

---

## What I found in the data

What was wrong with `readings.csv`, how you handled each thing, and anything you noticed but
deliberately left alone.

REPAIRED: 
 - The `verified` column has different string entries to denote true: Y, true, 1, TRUE; false: false, 0, no. 
 - There's at least two cases where there's white space surrounding a value. Nothing wrong with the value, just needs cleaning up.
 - There's at least one case of quotes around a meter reading value. Just a matter of cleaning up the value, treated similar to white space. (This specific row however is rejected because it uses a comma as a separator and is unexepectedly low).
 - Some rows had lowercase meter IDs. Meters table should store it all in capital letters, so that case sensitive searches don't incorrectly not find a reading.
 - The date value isn't uniform throughout. Some are written as DD/MM/YYYY. Will keep the date as YYYY-MM-DD. 
 - There are a few duplicate readings. Will keep one reading and leave duplicates out. Duplicate rows got rejected.
 - The same reading_id with a different value. The later line wins as it is likely a correction or more accurate reading, the earlier one is logged as superseded.

REJECT:
- There are some missing values. These values won't be imputed as an estimate, there is a way to 'estimate' a value here that but it can't be trusted (could've used a mean or estimate from either side). These are left out.
- There are also negative values, these will be deleted as we can't safely assume what the number should be. 
 - There are two readings from meters that do not exist in meters.json. These readings will not be included. There is therefore no member who will view this meter's usage.
 - There are readings before the meter was installed. These are also removed as that reading cannot be trusted.

 LOOKED WRONG, ACTUALLY ISN'T:
 - One meter seems to have rolled over and produced a subsequent low reading. 
 - Drops that are not rollovers are marked as suspect.



---

## Where I'm least confident

The gas conversion in allowance.ts. GAS_CALORIFIC_VALUE = 39.5 is a typical figure, but the real value changes by region and month.

The allowance rule in apps/api/src/allowance.ts: PERIOD_DAYS = 7, ALLOWANCE_KWH = 250
  - Unsure: whether 7 days is what the brief meant. 
  - Periods longer than 7 days come back as over: null, meaning not checked.

apps/api/sql/001_schema.sql, UNIQUE (meter_id, taken_at) (line 41)
  - Unsure: what happens when a file has two different reading IDs for the same meter on the same day.
  - If wrong: the insert fails and the whole ingest rolls back, because it's all one transaction. One bad row stops the entire file landing.
  - Fix: a rule that rejects that row instead of letting the database refuse it.

---

## What I didn't get to

Show the ingest report without psql. At the moment the data team still needs a database tool to see what was rejected. A GET /ingest-runs/latest endpoint or a small page would cover them not having to open the CSV themselves. 

The x-member-id header. Members should see only their own meters. Right now anyone can request any meter.
- A person's energy usage should be private to them and people should not be able to see other people's usage data. The header would let the API check that the meter belongs to the member making the request, and return 403 if it doesn't.

Public meter sharing, using the public flag that's already in meters.json.
- public is already there in the data, so those readings should be able to be shared. What is needed is a rule that allows anyone to see public readings  and hide private readings (only for a user's header) for a start

Report every problem on a row, not just the first.
- At the moment, when there are multiple problems with the readings, only the one error is reported.


