#!/usr/bin/env python3
"""Extract the two base64 PNG logos embedded in /tmp/floseseh/verify.html
and save them as real files under /home/z/my-project/public/assets/images/."""

import re, base64, os

SRC = "/tmp/floseseh/verify.html"
OUT_DIR = "/home/z/my-project/public/assets/images"
os.makedirs(OUT_DIR, exist_ok=True)

html = open(SRC, encoding="utf-8").read()

# Find all base64 PNG data URIs in order of appearance:
# 1st = header logo, 2nd = footer logo
uris = re.findall(r"data:image/png;base64,([A-Za-z0-9+/=]+)", html)
print(f"Found {len(uris)} base64 PNGs")

names = ["seha-verify-header.png", "seha-verify-footer.png"]
for i, b64 in enumerate(uris[:2]):
    raw = base64.b64decode(b64)
    out = os.path.join(OUT_DIR, names[i])
    with open(out, "wb") as f:
        f.write(raw)
    print(f"{out}: {len(raw)} bytes")

# Also copy the repo's Seha logo used by seha-enquiry.html
import shutil
src_logo = "/tmp/floseseh/الشعارات/Seha.png"
dst_logo = os.path.join(OUT_DIR, "Seha.png")
shutil.copyfile(src_logo, dst_logo)
print(f"{dst_logo}: {os.path.getsize(dst_logo)} bytes")
