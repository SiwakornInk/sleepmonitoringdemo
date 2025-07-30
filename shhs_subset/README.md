# SHHS Data Subset

This directory contains a subset of SHHS data for demo purposes.

## Subjects included:
- 200001
- 200002
- 200003
- 200004
- 200005

## Structure:
```
shhs_subset/
+-- shhs/
    +-- polysomnography/
        +-- edfs/
        |   +-- shhs1/
        |       +-- shhs1-XXXXXX.edf (EEG/ECG signals)
        +-- annotations-events-nsrr/
            +-- shhs1/
                +-- shhs1-XXXXXX-nsrr.xml (sleep stages & events)
```

## Usage:
Set environment variable: SHHS_PATH=/path/to/shhs_subset
