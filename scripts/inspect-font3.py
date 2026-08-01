import zlib, re, sys
from fontTools.ttLib import TTFont
from io import BytesIO

with open('/tmp/letters-test.pdf', 'rb') as f:
    data = f.read()

# Find all stream objects and try each as a font
obj_pattern = re.compile(rb'(\d+)\s+(\d+)\s+obj\s*(<<.*?>>)\s*stream\r?\n(.*?)\r?\nendstream', re.DOTALL)
for m in obj_pattern.finditer(data):
    obj_num = m.group(1).decode()
    header = m.group(3).decode('latin-1', errors='replace')
    raw = m.group(4)
    if 'FontFile' not in header and 'Subtype' not in header:
        continue
    # Check if it looks like font data
    try:
        decomp = zlib.decompress(raw)
    except:
        try:
            decomp = zlib.decompress(raw, -15)
        except:
            continue
    
    if decomp[:4] in (b'true', b'\x00\x01\x00\x00', b'OTTO', b'ttcf', b'typ1', b'wOFF'):
        print(f'Object {obj_num}: looks like font, first 4 bytes = {decomp[:4]}, size={len(decomp)}')
        # Save and try to load
        with open(f'/tmp/font_{obj_num}.bin', 'wb') as f:
            f.write(decomp)
        try:
            font = TTFont(BytesIO(decomp))
            print(f'  Loaded! sfntVersion={font.sfntVersion}')
            print(f'  Tables: {list(font.keys())}')
            if 'cmap' in font:
                cmap = font.getBestCmap()
                print(f'  cmap entries: {len(cmap)}')
                for cp in [0x064A, 0x0648, 0x0645, 0x0625, 0x0649, 0x0644, 0x0020]:
                    if cp in cmap:
                        print(f'    U+{cp:04X} {chr(cp)!r} -> glyph name {cmap[cp]}')
            if 'glyf' in font or 'CFF ' in font:
                go = font.getGlyphOrder()
                print(f'  Glyph order ({len(go)} glyphs):')
                for i, g in enumerate(go[:30]):
                    print(f'    GID {i}: {g}')
        except Exception as e:
            print(f'  Load error: {e}')
