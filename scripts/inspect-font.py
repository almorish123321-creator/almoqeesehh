import zlib, re
from fontTools.ttLib import TTFont

with open('/tmp/letters-test.pdf', 'rb') as f:
    data = f.read()

streams = []
pos = 0
while True:
    s = data.find(b'stream\r\n', pos)
    if s == -1:
        s = data.find(b'stream\n', pos)
        if s == -1: break
        s += 7
    else:
        s += 8
    e = data.find(b'\nendstream', s)
    if e == -1:
        e = data.find(b'\rendstream', s)
        if e == -1: break
    streams.append(data[s:e])
    pos = e + 10

# Find font program streams (Type1 CFF or TrueType glyf)
# These are streams that are referenced by /FontFile /FontFile2 /FontFile3
# Look at all font objects in PDF
font_streams = []
# Find all /F2 ... Font objects
font_objs = re.findall(rb'/F2\s+(\d+)\s+(\d+)\s+R', data)
print(f'F2 font refs: {font_objs}')

# Find all objects with /FontFile2 or /FontFile3
obj_pattern = re.compile(rb'(\d+)\s+(\d+)\s+obj\s*(.*?)\s*endobj', re.DOTALL)
for m in obj_pattern.finditer(data):
    obj_num = m.group(1).decode()
    obj_gen = m.group(2).decode()
    body = m.group(3)
    if b'/FontFile' in body or b'/FontDescriptor' in body:
        # Find the font file reference
        ff_match = re.search(rb'/FontFile(\d*)\s+(\d+)\s+(\d+)\s+R', body)
        if ff_match:
            ff_num = ff_match.group(2).decode()
            ff_gen = ff_match.group(3).decode()
            print(f'Font obj {obj_num} {obj_gen} -> FontFile {ff_num} {ff_gen}')
            font_streams.append((obj_num, ff_num, ff_gen))

# Now find the font file stream object
for obj_num, ff_num, ff_gen in font_streams:
    pattern = rf'{ff_num}\s+{ff_gen}\s+obj'.encode()
    idx = data.find(pattern)
    if idx == -1: continue
    end = data.find(b'endstream', idx)
    stream_start = data.find(b'stream', idx)
    if stream_start == -1 or stream_start > end: continue
    s = stream_start + 6
    if data[s:s+2] == b'\r\n': s += 2
    elif data[s:s+1] in (b'\n', b'\r'): s += 1
    raw = data[s:end]
    try:
        decomp = zlib.decompress(raw)
    except:
        try:
            decomp = zlib.decompress(raw, -15)
        except Exception as e:
            print(f'  Cannot decompress font: {e}')
            continue
    
    print(f'\nFont {ff_num} (size {len(decomp)} bytes)')
    # Save to file and load with fontTools
    with open('/tmp/font.woff', 'wb') as f:
        f.write(decomp)
    
    # Try to load as TTF/OTF
    try:
        font = TTFont('/tmp/font.woff')
        print(f'  Loaded: {font}')
        cmap = font.getBestCmap()
        print(f'  cmap entries: {len(cmap)}')
        # Print mapping for our codepoints of interest
        for cp in [0x064A, 0x0648, 0x0645, 0x0625, 0x0649, 0x0644, 0x0020]:
            if cp in cmap:
                print(f'    U+{cp:04X} {chr(cp)!r} -> glyph name {cmap[cp]}')
        # Print glyph order
        go = font.getGlyphOrder()
        print(f'  Glyph order (first 30): {go[:30]}')
    except Exception as e:
        print(f'  Failed to load font: {e}')
        # Maybe it's a WOFF, try to unwrap
        if decomp[:4] == b'wOFF':
            print('  Detected WOFF format')
            # Use fontTools to handle WOFF
            from io import BytesIO
            try:
                from fontTools.ttLib import TTFont as TTF2
                font = TTF2(BytesIO(decomp))
                print(f'  Loaded WOFF: {font}')
                cmap = font.getBestCmap()
                print(f'  cmap entries: {len(cmap)}')
                for cp in [0x064A, 0x0648, 0x0645, 0x0625, 0x0649, 0x0644, 0x0020]:
                    if cp in cmap:
                        print(f'    U+{cp:04X} {chr(cp)!r} -> glyph name {cmap[cp]}')
                go = font.getGlyphOrder()
                print(f'  Glyph order (first 30): {go[:30]}')
            except Exception as e2:
                print(f'  Failed WOFF too: {e2}')
