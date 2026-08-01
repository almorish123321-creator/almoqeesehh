import zlib, re, sys
from fontTools.ttLib import TTFont
from io import BytesIO

with open('/tmp/letters-test.pdf', 'rb') as f:
    data = f.read()

# Find object 14 0
idx = data.find(b'14 0 obj')
if idx == -1:
    print('Object 14 0 not found')
    sys.exit(1)
end = data.find(b'endobj', idx)
obj_body = data[idx:end]
print(f'Object 14 0 body (first 300 bytes):')
print(obj_body[:300])
print()

# Find stream within
stream_idx = obj_body.find(b'stream')
if stream_idx == -1:
    print('No stream in object 14')
    sys.exit(1)
s = stream_idx + 6
if obj_body[s:s+2] == b'\r\n': s += 2
elif obj_body[s:s+1] in (b'\n', b'\r'): s += 1
endstream_idx = obj_body.find(b'endstream', s)
raw = obj_body[s:endstream_idx]
# Strip trailing whitespace
raw = raw.rstrip()
print(f'Raw stream size: {len(raw)}')
print(f'First 4 bytes: {raw[:4]}')

try:
    decomp = zlib.decompress(raw)
    print(f'Decompressed size: {len(decomp)}')
    print(f'First 4 bytes: {decomp[:4]}')
except Exception as e:
    print(f'Decompress error: {e}')
    # Try raw
    decomp = raw

# Save
with open('/tmp/font.bin', 'wb') as f:
    f.write(decomp)

# Load with fontTools
try:
    font = TTFont(BytesIO(decomp))
    print(f'\nLoaded font: {font}')
    print(f'Font type: {font.sfntVersion}')
    cmap = font.getBestCmap()
    print(f'cmap entries: {len(cmap)}')
    for cp in [0x064A, 0x0648, 0x0645, 0x0625, 0x0649, 0x0644, 0x0020, 0x0028, 0x0029, 0x0030, 0x0039]:
        if cp in cmap:
            print(f'  U+{cp:04X} {chr(cp)!r} -> glyph name {cmap[cp]}')
    go = font.getGlyphOrder()
    print(f'\nGlyph order ({len(go)} glyphs):')
    for i, g in enumerate(go):
        print(f'  GID {i}: {g}')
except Exception as e:
    print(f'Load error: {e}')
    import traceback
    traceback.print_exc()
