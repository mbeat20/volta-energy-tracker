# AI notes

Fill this in as you go — it's much harder to reconstruct at the end.

Use whatever AI tooling you normally use. We're not testing whether you can work without it; we're
interested in _how_ you work with it. Being straightforward here counts in your favour.

---

## Prompts worth keeping

Paste a handful of the prompts that actually mattered — the ones that unlocked something, and the
ones that sent you the wrong way. Rough and unedited is fine.

```
load the data from seed/ into a pandas dataframe. create one   for members, meters and readings so that I can expore the     data. Dont fix or drop anything - keep it as is.
```

What I expected back / what I got:

I got what I was asking for, but I afterwards realised that in a real case scenario, it mgiht be against some privacy laws to let an AI model read and assess that data. Realised after it gave me a breakdown in what may be wrong in the data.

------------------------------

Here is the draft schema to create the tables. The file will be called 001_schema.sql and will be   
  in apps/api/sql.                                                                                    
  There are 5 tables:                                                                                 
  1. members (id (text): PK, name (text))                                                             
  2. meters (id (text): PK, member_id (text): FK, fuel (text), unit (text), installed_on (date),      
  is_public (boolean))                                                                                
  3. readings (reading_id (text): PK, meter_id (text): FK, taken_at (date), value (numeric), source   
  (text), verified (boolean), ingest_run_id (integer): FK)                                            
  4. ingest_runs (id (int): PK, file_name (text), started_at (date), finished_at (date),              
  accepted_count (int), rejected_count (int), duplicate_count (int))                                  
  5. ingest_issues (id (int); PK, ingest_run_id (int): FK, reading_id (text), raw_row (jsonb),        
  outcome (text: values - repaired, rejected), reason (text))

  What I expected back / what I got:

  I expected it to just run as I had set out, but it reviewed my choices and cam eback with potenital issues and fixes for those. It told me to use timestampz as a data type instead of date for the started_at and finished_at. It also told me to decide how id columsn get their values and suggested (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY).
  It also suggested I use the database to enfiroce rules, such as NOT NULL checks and other logic checks on values. 

  I accepted its suggestion and the SQL was implemented
---

## Something it got wrong

At least one. Over several hours in an unfamiliar stack there will be something.

- What it produced:
- How I noticed:
- What I did about it:

---

## Something I rejected

- What it suggested:
- Why I didn't take it:

---

## Where I leaned on it hardest

Which parts of this codebase would you struggle to change without help?
