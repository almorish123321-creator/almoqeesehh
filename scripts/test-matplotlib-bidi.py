#!/usr/bin/env python3
"""
Render the duration cell using matplotlib + Noto Sans Arabic (TTF)
and compare with the PDFKit output.
"""
import arabic_reshaper
from bidi.algorithm import get_display
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import subprocess

# Find a TTF Noto Sans Arabic
import os
candidates = [
    '/usr/share/fonts/truetype/noto-sans-arabic/NotoSansArabic-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansArabic-Regular.otf',
]
# Search filesystem
result = subprocess.run(['find', '/usr/share/fonts', '-name', '*NotoSansArabic*', '-o', '-name', '*noto*sans*arabic*'], capture_output=True, text=True)
print('Found fonts:')
print(result.stdout)
candidates.extend(result.stdout.strip().split('\n'))

font_path = None
for c in candidates:
    if c and os.path.exists(c):
        font_path = c
        break
print(f'Using font: {font_path}')

if font_path:
    try:
        fm.fontManager.addfont(font_path)
        font_name = fm.FontProperties(fname=font_path).get_name()
        print(f'Font name: {font_name}')
        plt.rcParams['font.sans-serif'] = [font_name, 'DejaVu Sans']
    except Exception as e:
        print(f'Failed to load font: {e}')

plt.rcParams['axes.unicode_minus'] = False

# Test strings
strings = [
    'يوم',
    'إلى',
    '2 يوم ( 09-06-2026 إلى 10-06-2026 )',
]

fig, axes = plt.subplots(len(strings), 1, figsize=(12, 4), constrained_layout=True)
for i, s in enumerate(strings):
    ax = axes[i]
    ax.set_facecolor('#2c3e77')
    ax.text(0.5, 0.5, s, color='white', fontsize=20, ha='center', va='center',
            transform=ax.transAxes)
    ax.set_title(f'Input: {repr(s)}', fontsize=10, loc='left')
    ax.set_xticks([])
    ax.set_yticks([])

plt.savefig('/home/z/my-project/download/matplotlib-bidi-test.png', dpi=150)
print('Saved /home/z/my-project/download/matplotlib-bidi-test.png')

# Also print the BiDi-processed versions
print('\nBiDi-processed strings:')
for s in strings:
    reshaped = arabic_reshaper.reshape(s)
    display = get_display(reshaped)
    print(f'  Input:    {repr(s)}')
    print(f'  Reshaped: {repr(reshaped)}')
    print(f'  Display:  {repr(display)}')
    print()
