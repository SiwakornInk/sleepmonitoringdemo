# SHHS Data Subset - Simple Version

This directory contains 2 complete SHHS subjects for deployment demo.

## Subjects included:
- Subject 200001 (full ~8 hour recording)
- Subject 200002 (full ~8 hour recording)

## Structure:
```
shhs_subset/
+-- shhs/
    +-- polysomnography/
        +-- edfs/
        |   +-- shhs1/
        |       +-- shhs1-200001.edf
        |       +-- shhs1-200002.edf
        +-- annotations-events-nsrr/
            +-- shhs1/
                +-- shhs1-200001-nsrr.xml
                +-- shhs1-200002-nsrr.xml
```

## Usage:
Set environment variable: SHHS_PATH=shhs_subset
