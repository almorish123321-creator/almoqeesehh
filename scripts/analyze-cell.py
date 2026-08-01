from PIL import Image
import numpy as np

img = Image.open('/home/z/my-project/download/dur-ar-current.png')
arr = np.array(img)
print(f'Image: {arr.shape}')

# The cell area: white border around dark blue cell with white text
# Find the dark blue region
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
dark_blue = (r < 80) & (g < 100) & (b > 80) & (b < 160)
print(f'Dark blue pixels: {dark_blue.sum()}')

# Bounding box of dark blue
rows_with = np.where(dark_blue.any(axis=1))[0]
cols_with = np.where(dark_blue.any(axis=0))[0]
print(f'Dark blue rows: {rows_with.min()}-{rows_with.max()}')
print(f'Dark blue cols: {cols_with.min()}-{cols_with.max()}')

# Crop just the dark blue cell area
cell = img.crop((cols_with.min(), rows_with.min(), cols_with.max()+1, rows_with.max()+1))
cell.save('/home/z/my-project/download/dur-cell-only.png')
print(f'Cell only: {cell.size}')

# Now within the cell, find white text pixels
cell_arr = np.array(cell)
cr, cg, cb = cell_arr[:,:,0], cell_arr[:,:,1], cell_arr[:,:,2]
white_text = (cr > 200) & (cg > 200) & (cb > 200)
print(f'White text pixels in cell: {white_text.sum()}')

# Find column runs of white text
col_has = white_text.any(axis=0)
runs = []
in_run = False
start = 0
last = 0
GAP = 3
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

print(f'\nFound {len(runs)} text column runs in cell (gap={GAP}px):')
for s, e in runs:
    w = e - s
    sl = white_text[:, s:e]
    rows = np.where(sl.any(axis=1))[0]
    top, bot = (rows[0], rows[-1]) if len(rows) else (0,0)
    print(f'  x={s}-{e} (width={w}) rows {top}-{bot} pixels={sl.sum()}')
