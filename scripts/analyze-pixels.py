from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/download/dur-ar-current.png')
arr = np.array(img.convert('RGB'))

# Background is dark blue (44, 62, 119)
# Text is white (255, 255, 255)
# But there are also anti-aliased pixels in between

# Strict white detection
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
strict_white = (r > 240) & (g > 240) & (b > 240)
print(f'Strict white pixels: {strict_white.sum()}')

# Find columns with strict white
col_has = strict_white.any(axis=0)
runs = []
in_run = False
start = 0
last = 0
GAP = 8
for i, h in enumerate(col_has):
    if h:
        if not in_run:
            start = i
            in_run = True
        last = i
    elif in_run and (i - last) > GAP:
        runs.append((start, last+1))
        in_run = False
if in_run:
    runs.append((start, last+1))

print(f'\nFound {len(runs)} text runs (gap={GAP}px):')
for s, e in runs:
    w = e - s
    sl = strict_white[:, s:e]
    rows = np.where(sl.any(axis=1))[0]
    top, bot = (rows[0], rows[-1]) if len(rows) else (0,0)
    print(f'  x={s}-{e} (width={w}) rows {top}-{bot} pixels={sl.sum()}')
