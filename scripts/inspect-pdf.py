import zlib, re, sys

with open('/tmp/full-test.pdf', 'rb') as f:
    data = f.read()

streams = re.findall(rb'stream\r?\n(.*?)\r?\nendstream', data, re.DOTALL)
print(f'Found {len(streams)} streams')

# Find streams that contain U+FEE1 (ﻡ), U+FEEE (ﻮ), U+FEF3 (ﻳ) — the presentation forms for "يوم"
# These appear as either UTF-16BE bytes (fe f1 etc.) or as glyph IDs
for i, s in enumerate(streams):
    try:
        decomp = zlib.decompress(s)
        # Look for the raw Arabic chars (encoded as UTF-16BE)
        # fee1 = ﻡ, feee = ﻮ, fef3 = ﻳ
        if b'\xfe\xe1' in decomp or b'\xfe\xee' in decomp or b'\xfe\xf3' in decomp:
            print(f'=== Stream {i} (contains raw ﻡ/ﻮ/ﻳ) ===')
            # Show all TJ/Tj ops
            ops = re.findall(rb'\[(.*?)\]\s*TJ', decomp)
            for op in ops:
                # Extract hex strings
                hex_matches = re.findall(rb'<([0-9a-fA-F]+)>', op)
                for hm in hex_matches:
                    decoded_hex = hm.decode()
                    try:
                        decoded_bytes = bytes.fromhex(decoded_hex)
                        # Try UTF-16BE
                        text = decoded_bytes.decode('utf-16-be', errors='replace')
                        print(f'  hex={decoded_hex} utf16be="{text}"')
                    except:
                        pass
    except Exception as e:
        pass
