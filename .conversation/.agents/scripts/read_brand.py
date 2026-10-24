from pathlib import Path
import fitz

doc = fitz.open("attached_assets/Mark_Harbert_-_Brand_Guide_v1.0_1792812594159.pdf")
out = Path(".agents/outputs/brand")
out.mkdir(parents=True, exist_ok=True)
for index in [2, 4, 15, 16]:
    page = doc[index]
    page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(str(out / f"page-{index+1}.png"))
print(f"Rendered 4 reference pages from {len(doc)} pages.")
