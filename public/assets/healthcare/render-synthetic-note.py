"""Create the wholly fictional evaluation page; requires Pillow and Arial fonts.

Run from any directory. Font substitution may change the generated pixels/OCR.
The printed content is test material, not clinical advice or a patient record.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1530, 1980
image = Image.new("RGB", (WIDTH, HEIGHT), "white")
draw = ImageDraw.Draw(image)
font_root = Path("/System/Library/Fonts/Supplemental")
regular = ImageFont.truetype(str(font_root / "Arial.ttf"), 31)
bold = ImageFont.truetype(str(font_root / "Arial Bold.ttf"), 31)
title = ImageFont.truetype(str(font_root / "Arial Bold.ttf"), 44)
small = ImageFont.truetype(str(font_root / "Arial.ttf"), 26)
ink, muted, border = "#202020", "#494949", "#B7B7B7"
blocks = []

def text(content, y, font=regular, color=ink, x=96):
    if draw.textbbox((0, 0), content, font=font)[2] > WIDTH - x - 90:
        raise ValueError(f"Text exceeds page width: {content}")
    draw.text((x, y), content, fill=color, font=font)
    blocks.append(content)

def section(label, y):
    draw.rectangle((88, y-8, WIDTH-88, y+43), fill="#F2F2F2")
    text(label, y, bold)

text("SYNTHETIC / NOT A PATIENT RECORD", 84, title)
text("Clinical document abstraction exercise", 148, bold)
text("All content and identifiers are fictional. Not clinical guidance.", 196, small, muted)
draw.line((88, 251, WIDTH-88, 251), fill=border, width=2)

section("DOCUMENT AND ENCOUNTER", 285)
text("Document ID: DEMO-DOCUMENT-001     Page: 1 of 1", 344)
text("Patient ID: DEMO-PATIENT-ALPHA", 391)
text("Encounter ID: DEMO-ENCOUNTER-001", 438)
text("Encounter date: 2026-01-10     Note date: 2026-01-11", 485)

section("SUBJECT AND ASSERTION STATUS", 573)
text("Patient reports mild fatigue. Patient denies chest pain.", 632)
text("Family history: Mother has diabetes mellitus.", 679)
text("Patient diabetes status: not documented in this note.", 726)
text("Allergies: unknown; verification is pending.", 773)

section("HISTORY AND MEDICATION LIST", 861)
text("Past procedure: appendectomy, documented in 2014.", 920)
text("Historical list: Example medicine A, 0.5 mg, oral, once daily.", 967)
text("Current use is unverified. This is not a medication order.", 1014)

section("RECORDED RESULT", 1102)
text("Glucose: 104 mg/dL. Specimen date: 2026-01-09.", 1161)
text("Result date: 2026-01-10. Interpretation: not recorded.", 1208)

section("PLAN AND FOLLOW-UP", 1296)
text("ECG ordered for 2026-01-17.", 1355)
text("Completion and result are not documented in this note.", 1402)
text("An order alone does not establish that the test was performed.", 1449)

draw.line((88, 1562, WIDTH-88, 1562), fill=border, width=2)
text("REVIEW EXERCISE", 1598, bold)
text("Check source fidelity, identity, subject, negation, time, and units.", 1652, small)
text("Missing documentation does not prove missing care.", 1696, small)
text("Do not use this page for patient care or treatment decisions.", 1740, small)
text("Synthetic evaluation fixture / OCR Workbench / 1", 1853, small, muted)

image.save(HERE / "synthetic-clinical-note.png", dpi=(180, 180), optimize=True)
(HERE / "synthetic-clinical-note-source.txt").write_text("\n".join(blocks)+"\n", encoding="utf-8")
print(f"Rendered {WIDTH} x {HEIGHT} synthetic page")
