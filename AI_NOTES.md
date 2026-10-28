# AI notes

Fill this in as you go — it's much harder to reconstruct at the end.

Use whatever AI tooling you normally use. We're not testing whether you can work without it; we're
interested in _how_ you work with it. Being straightforward here counts in your favour.

---

## Prompts worth keeping


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

  I expected it to just run as I had set out, but it reviewed my choices and came back with potenital issues and fixes for those. It told me to use timestampz as a data type instead of date for the started_at and finished_at. It also told me to decide how id columsn get their values and suggested (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY).
  It also suggested I use the database to enforce rules, such as NOT NULL checks and other logic checks on values. 

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
  value with a comma decimal is rejected.                                                            
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

  -----------------------
  the next thing we need to do is create the web page where a user can see their usage. to start,     
  anyone should be able to see any meter. the page should display a dropdown of meters, which needs a 
  GET /meters endpoint and picking the meter loads its usage.                                         
  Show a loading state while the fetch is happening, an error if the api is down or there is an error 
  returned and a empty state if the meter has no usage.                                               
  Display a table of periods with from, to and the usage for the meter's unit.                        
  for GET /meters, return the id, fuel and unit only.                                                 
  Use whatever the template already uses to reach the API; tell me which.

  --------------------------
  I am going to define a period between a FROM and TO (one reading period). The usage should be below 
  250kwH. A period is 7 days long. Ignore gas readiugns for now, electricity only. In usage.ts,  include difference=usage-250, and over: boolean. Ignore periods longer than 7 days. Return it in    
  the existing GET /meters/:id/usage response. No new route.

## Something it got wrong


- What it produced: The table columns were cramped together
- How I noticed: I looked at the page of readings, the columns looked on top of eachother and laid out unneatly.
- What I did about it: asked it to rename or separate the headers. It shortened them ("vs 250 kWh", "Over?") and added cellPadding={8} to the table.

---

## Something I rejected

- What it suggested: To use all of the meter's readings as one period. Its reasoning was that under that rule MTR-1003 (306.6 kWh) and MTR-1007 (336.2 kWh) are over, and MTR-1004 sits on exactly 250.0,
which "looks like the data was built to test this".
- Why I didn't take it: I defined a period as a week. It made more sense to me, as readings were recorded weekly; to me that is 'one period'.

---

## Where I leaned on it hardest


Typescript code - I am new to the language so would not be able to change much of the functions and .ts scripts without help from AI. I can follow what each function does and I understand the logic, but I'd need help actually changing the code or writing functions from scratch.

The frontend code, I am more comfortable working in the backend, such as SQL and APIs over client facing code. Even though I did not write the SQL myself, I knew how to structure the tables and design the schema that made most sense to me. I am not comfortable using React and things like effects.

