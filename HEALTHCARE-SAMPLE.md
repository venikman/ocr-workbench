# Synthetic healthcare example

The included clinical note is **wholly fictional**, authored for this review workbench. It was not copied, de-identified, or transformed from any patient record. It contains no real patient identity. Identifiers beginning `DEMO-` and “Example medicine A” are deliberate test strings, not identifiers or medications to use in care. The image prominently states “SYNTHETIC / NOT A PATIENT RECORD.” No diagnosis or treatment guidance is intended.

The source image is `public/assets/healthcare/synthetic-clinical-note.png`: a clean 1530 × 1980 pixel raster generated at 180 dpi with Pillow 12.3.0 and macOS Arial fonts. It was visually inspected for legibility, clipping, and correspondence with the authored text. The renderer and authored text are included next to the image.

## What the example exercises

The clinical domain profile is a local review policy. Its concepts and relations describe types, not extracted patient facts or standardized terminology mappings. The example tests the review workflow's ability to preserve these source distinctions:

| Source statement | Required distinction |
| --- | --- |
| Patient and encounter IDs; different encounter and note dates | Separate document, subject, encounter, and date context |
| Patient denies chest pain | Negated symptom, not a positive finding |
| Mother has diabetes; patient status not documented | Family subject differs from patient; missing information differs from absence |
| Allergies unknown; verification pending | Unknown differs from no known allergies |
| Appendectomy documented in 2014 | Reported historical procedure differs from current procedure |
| Historical list: Example medicine A, 0.5 mg, oral, once daily; current use unverified | Preserve dose, decimal, unit, route, frequency, and list status |
| Glucose 104 mg/dL; distinct specimen and result dates; no interpretation | Keep value, unit, dates, and interpretation status together |
| Future ECG order; completion and result not documented | Plan differs from performed care; missing documentation does not prove nonperformance |

Eight annotations start **open and unreviewed**. The first identifies an observed OCR artifact: inserted separator characters after the document ID. The other seven explicitly say “Review prompt” because they demonstrate meaning checks, not established OCR errors. Each has an image box, actual OCR line range, and links to the applicable concepts and review rules. None starts with an accepted clinical mapping.

## Actual OCR provenance

Tesseract **5.5.2**, Leptonica **1.87.0**, English LSTM engine, `--oem 1 --psm 3`, processed the PNG locally on **2026-10-07**. The command completed with exit code 0 and no stderr. Its UTF-8 output, including blank lines and final newline, is retained unchanged in `synthetic-clinical-note-psm3.txt` and `src/healthcare-demo.js`. `public/assets/healthcare/provenance.json` records the execution timestamp, exact command, version output, and SHA-256 hashes of the image, renderer, authored text, and OCR output.

| Asset | SHA-256 |
| --- | --- |
| `synthetic-clinical-note.png` | `6c2cba925cfff2dd90309de30071290bbc56ab110aafc8f8032f97f8326e7864` |
| `synthetic-clinical-note-psm3.txt` | `f6c99d8e09590834cf16811e4f7f13622bf4555e5269c2d58996d652fc2ea1f5` |

To reproduce from the app directory, with Pillow, the renderer's macOS Arial font files, Tesseract, and English language data installed:

```sh
python3 public/assets/healthcare/render-synthetic-note.py
tesseract public/assets/healthcare/synthetic-clinical-note.png public/assets/healthcare/synthetic-clinical-note-psm3 -l eng --oem 1 --psm 3
node --test tests/healthcare-fixtures.test.mjs
```

The original execution used `/opt/homebrew/bin/tesseract`. Renderer fonts, library versions, and language data can affect newly generated pixels and OCR output. The fixture tests verify the captured assets and their anchors; they do not rerun or benchmark an OCR engine.

## Evidence boundary

This is one clean synthetic page and one actual OCR run. It is useful for exercising review controls, domain assignment, evidence links, and import/export preservation. It provides no estimate of accuracy on real clinical documents, handwriting, scans, languages, specialty terminology, longitudinal records, or production data. It is not clinical validation, a representative healthcare benchmark, HIPAA assessment, patient-identity verification, standardized terminology mapping, or FHIR conformance evidence.
