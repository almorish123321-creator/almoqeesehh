import zlib, re, sys

with open('/tmp/full-test.pdf', 'rb') as f:
    data = f.read()

# Find all FlateDecode streams
streams = []
pos = 0
while True:
    s = data.find(b'stream', pos)
    if s == -1: break
    # Skip 'stream' keyword
    s += 6
    # Skip line break
    if data[s:s+2] == b'\r\n': s += 2
    elif data[s:s+1] in (b'\n', b'\r'): s += 1
    e = data.find(b'endstream', s)
    if e == -1: break
    streams.append(data[s:e])
    pos = e

print(f'Found {len(streams)} streams')

for i, s in enumerate(streams):
    # Try to decompress
    try:
        decomp = zlib.decompress(s)
    except:
        try:
            decomp = zlib.decompress(s, -15)
        except:
            continue
    
    # Look for the duration Arabic text - PDFKit uses font subset, so we look for
    # TJ operators with glyph IDs. The duration cell uses NotoSansArabic + Times-Roman.
    # Arabic chars in NotoSansArabic subset get assigned sequential GIDs (0001, 0002, ...)
    # in the order they appear in the font's subset.
    #
    # Instead, let's look at TJ operators and reconstruct the text using the ToUnicode CMap.
    
    # Just print all TJ/Tj ops in this stream
    if b'TJ' in decomp:
        print(f'\n=== Stream {i} (size {len(decomp)}) ===')
        # Find TJ operators: [...] TJ
        ops = re.findall(rb'\[(.*?)\]\s*TJ', decomp, re.DOTALL)
        for j, op in enumerate(ops):
            # Each op is a sequence of <hex> and -num (kerning) entries
            # Extract just the hex strings
            hex_matches = re.findall(rb'<([0-9a-fA-F]+)>', op)
            if not hex_matches: continue
            # Decode each hex as 2-byte (UTF-16BE) glyph IDs
            gid_seq = []
            for hm in hex_matches:
                decoded = bytes.fromhex(hm.decode())
                # 2-byte glyph IDs
                for k in range(0, len(decoded), 2):
                    if k+1 < len(decoded):
                        gid = (decoded[k] << 8) | decoded[k+1]
                        gid_seq.append(gid)
            # Print as hex sequence (we'll map to Unicode via ToUnicode later)
            if gid_seq:
                # Only print interesting ones (skip pure ASCII)
                has_high = any(g > 0x7F for g in gid_seq)
                if has_high or len(gid_seq) > 5:
                    gid_hex = ' '.join(f'{g:04x}' for g in gid_seq)
                    print(f'  TJ[{j}] ({len(gid_seq)} glyphs): {gid_hex[:200]}')
