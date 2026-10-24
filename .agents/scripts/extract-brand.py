from pathlib import Path
import pymupdf

pdf = pymupdf.open(".local/conversation-workspace/files/attached_assets/Mark_Harbert_-_Brand_Guide_v1.0_1792812594159.pdf")
out = Path("artifacts/the-555-plan/public")
out.mkdir(parents=True, exist_ok=True)
for xref, name in [(11, "mark-harbert-logo"), (27, "mark-headshot"), (12, "mark-icon")]:
    pix = pymupdf.Pixmap(pdf, xref)
    mask = next((entry[1] for page in pdf for entry in page.get_images(full=True) if entry[0] == xref), 0)
    if mask:
        pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(pdf, mask))
    pix.save(str(out / f"{name}.png"))
    print(f"Extracted {name}, {pix.width}x{pix.height}")
