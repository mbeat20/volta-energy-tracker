# Solution notes

Your write-up. Keep it short — bullets are fine. This is read closely, so don't skip it.

---

## How to run anything you added

Anything beyond what's already in the README — migrations, a seed step, env vars, test commands.

---

## Decisions I made, and what I traded away

Three or four is plenty. For each: what you chose, what you gave up, and why.

---

## Questions the brief didn't answer

Where the requirements were unclear or contradicted the data, what you decided, and on what basis.
There is no single right answer to any of these — we're interested in the fact that you spotted
them and made a call.

---

## What I found in the data

What was wrong with `readings.csv`, how you handled each thing, and anything you noticed but
deliberately left alone.

Firstly, there were clear visual difficulties in the data. These include: 
 - The `verified` column has different string entries to denote true: Y, true, 1, TRUE; false: false, 0, no. 
 (FIX)
 - There's at least two cases where there's white space surrounding a value.
 (FIX)
 - There are some missing values. 
 (REJECT)
 - There's at least one case of quotes around a meter reading value.
 (FIX) 
 - The date value isn't uniform throughout.  
 (FIX)
 - There are negative values in the meter readings where there shouldn't be. 
 (REJECT)
 - There are a few duplicate readings.
 (REJECT)
 - Lowercase meter IDs.
 (FIX)

On closer expection there is more wrong wioth the data than meet they eye:
 - There are two readings from meters that do not exist in meters.json
 (REJECT)
 - There are meetings before the meter was installed. (MTR-1005 has readings fromt wo weeks before installation date)
 (REJECT)
 - There are some rows with the same ID but different values.
 (TAKE THE LATER READING ONLY)
 - Readings that don't fit in between the two adjacent values (RDG-4091).
 - Reading value that doesnt follow on from the previous one (RDG-4078) - likely rollover, largest allowable inputted value likely 100000.
 (FIX)

---

## Where I'm least confident

Name specific files or functions, not "the tests". This is the most useful section in the document
and we will ask about it.

---

## What I didn't get to

And what you'd do next, in the order you'd do it.
