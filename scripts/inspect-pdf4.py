import zlib, re

with open('/tmp/full-test.pdf', 'rb') as f:
    data = f.read()

# Find all streams with proper boundaries
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

print(f'Found {len(streams)} streams')

for i, s in enumerate(streams):
    try:
        decomp = zlib.decompress(s)
    except Exception as e:
        try:
            decomp = zlib.decompress(s, -15)
        except Exception as e2:
            print(f'Stream {i}: cannot decompress ({e}, {e2})')
            continue
    
    print(f'\n=== Stream {i} (decompressed size {len(decomp)}) ===')
    # Show first 500 bytes
    preview = decomp[:500].decode('latin-1', errors='replace')
    print(preview[:500])
