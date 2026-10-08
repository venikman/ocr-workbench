# Sample sources and OCR provenance

The bundled examples use the County of Alameda Department of Environmental Health's public [Official Retail Food Inspection Report](https://deh.acgov.org/operations-assets/docs/foodsafety/OFFICIAL%20INSPECTION%20REPORT%20FORM.pdf). Retrieved on 2026-10-06. The downloaded PDF is four pages and 251,356 bytes. This is a blank historical form, not a claim about current inspection requirements.

Two pages are included as review cases: PDF page 1 (risk factors and retail practices) and PDF page 3 (temperature control and corrective actions). `public/assets/alameda-official-inspection-report.pdf` is the unchanged download. The PNGs are direct renders at 180 dpi (1530 × 1980 pixels), without retouching. Both PNGs were visually inspected against the form content.

## Actual OCR runs

Each image was processed twice with local **Tesseract 5.5.2**, Leptonica 1.87.0, English language data, LSTM-only engine (`--oem 1`). PSM 3 uses automatic page segmentation; PSM 6 treats the page as one uniform text block. Poppler `pdftoppm` version: **26.05.0**.

All four runs finished successfully. The raw UTF-8 output is copied unchanged into `src/demo.js` and also preserved as the `.txt` assets listed below, including its original whitespace and trailing newline. There are no Chandra, cloud model, accuracy, confidence, latency, or benchmark claims in these samples.

The four seeded annotations on page 1 are starter observations made by comparing the actual OCR against the rendered source. They are editable, remain open, and do not mark either run reviewed. Page 3 starts with no annotations. This is not an exhaustive accuracy evaluation or an approved ground-truth dataset.

## Reproduce

From this project directory, with Poppler, Tesseract, and English Tesseract data installed:

```sh
mkdir -p work/ocr-source
pdftoppm -f 1 -singlefile -r 180 -png public/assets/alameda-official-inspection-report.pdf work/ocr-source/alameda-inspection-page-1
pdftoppm -f 3 -singlefile -r 180 -png public/assets/alameda-official-inspection-report.pdf work/ocr-source/alameda-inspection-page-3
tesseract work/ocr-source/alameda-inspection-page-1.png work/ocr-source/alameda-page-1-psm3 -l eng --oem 1 --psm 3
tesseract work/ocr-source/alameda-inspection-page-1.png work/ocr-source/alameda-page-1-psm6 -l eng --oem 1 --psm 6
tesseract work/ocr-source/alameda-inspection-page-3.png work/ocr-source/alameda-page-3-psm3 -l eng --oem 1 --psm 3
tesseract work/ocr-source/alameda-inspection-page-3.png work/ocr-source/alameda-page-3-psm6 -l eng --oem 1 --psm 6
```

The actual Tesseract executable used for these runs was `/opt/homebrew/bin/tesseract`. During rendering, Poppler printed `Fontconfig error: Cannot load default config file: File not found`; both render commands returned exit code 0 and produced legible, visually inspected images. Font substitution, platform, or language-data differences can change new render/OCR results even with matching flags.

## SHA-256

Paths below are relative to `public/assets/`.

| File | SHA-256 |
| --- | --- |
| `alameda-official-inspection-report.pdf` | `ec8cc9eb3ae913bff55dd4f884bb404331a6ded8a0ad5672a83fff1d4a21855c` |
| `alameda-inspection-page-1.png` | `4e4f9da462fc5591df4553107344cdfd1e1c653db6c7dc69f7da63d7b8e0d0a1` |
| `alameda-inspection-page-3.png` | `9fab8f48a5b38378948d61414b902056b0d5bc27eb87245ffdf9b432c91e011f` |
| `alameda-page-1-psm3.txt` | `bc91806870558b402d0d189e297921187eeff34f4a4f4de1462259d22e56657d` |
| `alameda-page-1-psm6.txt` | `33d70f95aae3b0c88828a5fe598b5a73e396508418c8a33a83fa8906d613b9b4` |
| `alameda-page-3-psm3.txt` | `00276322ab191d67e9e93c223c4aa26d4889d1eba3bc927f3e3ad62305f683fb` |
| `alameda-page-3-psm6.txt` | `8723f55312f73836a97bf0ba60a4e6ec4164cf07834cced046bb8f3ad943a124` |
