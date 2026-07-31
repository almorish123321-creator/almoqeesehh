import zlib, re

with open('/tmp/full-test.pdf', 'rb') as f:
    data = f.read()

streams = re.findall(rb'stream\r?\n(.*?)\r?\nendstream', data, re.DOTALL)
print(f'Found {len(streams)} streams')

for i, s in enumerate(streams):
    try:
        decomp = zlib.decompress(s)
        print(f'\n=== Stream {i} (size {len(decomp)}) ===')
        # Show all Tj/TJ ops with their content
        # Pattern: [(...)] TJ or (text) Tj
        ops = re.findall(rb'\[(.*?)\]\s*TJ', decomp)
        for j, op in enumerate(ops):
            hex_matches = re.findall(rb'<([0-9a-fA-F]+)>', op)
            if hex_matches:
                print(f'  TJ[{j}]:')
                for hm in hex_matches:
                    decoded_hex = hm.decode()
                    try:
                        decoded_bytes = bytes.fromhex(decoded_hex)
                        text = decoded_bytes.decode('utf-16-be', errors='replace')
                        # Only print if it has interesting content
                        if any(c not in '\x00\x01\x02\x03\x04\x05' for c in text):
                            print(f'    hex={decoded_hex[:60]} utf16="{text[:50]}"')
                    except:
                        pass
    except Exception as e:
        print(f'Stream {i}: error: {e}')
