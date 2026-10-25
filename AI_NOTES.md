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
The next thing to do is to load in the JSON files from seed/, members and meters, in that order.    
  create a src/seed.ts that loads the json files into their tables. beware fo the column is_public,   
  the field name in meters is 'public'.  afterwards, create a db:seed script.

  -----
  Now we need to ingest the readings data from readings.csv. We first need to create adn define the   
  rules before the ingest takes palce. create rules.ts. it is a function that should take in one row  
  from the csv and return either accepted reading or rejected, with a reason. there should also be a  
  list of repairs applied. Apply these rules:                                                         
  Trim whitespace from every field.                                                                   
  Reject the reading row if the meter_id is not in meters.json.                                       
  Verified column: Y/yes/true/TRUE/1 becomes true, N/no/false/NO/o become false.                      
  Keep dates as YYYY-MM-DD, if it is DD/MM/YYY, convert it and log as a repair.                       
  Reject the value if it is empty,N/A,non-numeric or negative                                         
  Reject taken_at if taken_at is before the meter's installed_on date.                                
  Uppercase meter_id before the lookup.                                                               
  value with a comma decimal is rekjected.                                                            
  Add only these rules. Write vitest tests, one per rule.

  What it did was fix the problems and tested it. It aslo suggested things I may have missed. such as impossible dates, 31/02/2026. I forgto to log trims and uppercasing as repairs, the agent handled that too.I didnt specify what to do with unrecognised values/date formats, so it did this: 'An unrecognised verified value or date format is rejected.' I also didnt specify on how to report errors with more than one problem, it decided to report just the first error that came up.

  ------------------
  now create ingest.ts to load readings.csv into the database. we need this to start a run by         
  inserting a row into ingest_rows with started_at and the file name.                                 
  Load the meters fromt eh database into the Map that applyRules expects.                             
  Read and parse the csv.                                                                             
  run applyRules on each row. Rejected rows go to ingest_issues (outcome rejected, plus the reason    
  and the raw row), and repaired rows also log an issue (outcome repaired).                           
  Handle cross row cases. duplicates: keep one copy, remove other duplicate rows.                     
  same ID with different values: keept he later row. log the lost one.                                
  upsert accepted rows.                                                                               
  finish the run by updating finished_at and the counts.

  ---------------------
  now create the GET /meters/:id/usage endpoint.                                                      
  create usage.ts: a function that takes one meter's readings and retuirns the usage between each     
  pair of consecutive readings, sorted by taken_at. There is one rollover rule: if the reading is     
  lower than the previous one, and the previous reading is close to 99999.99, then usage  =           
  100000-prvious + current. write vitest tests in usage.test.ts.                                      
  JSON should be returned with the meter's fuel, its unit and the usage in the periods. Dont add any  
  auth, x-member-id header, allowance check or sharing yet. 

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
