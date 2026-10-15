"""Renders the app icon: a bourbon rocks glass with a square ice cube, as PNGs (no dependencies)."""
import os, struct, sys, zlib

OUT = sys.argv[1]
SIZES = [int(s) for s in sys.argv[2:]] or None
SS = 4  # supersampling per axis

def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))

TOP, BOTTOM = hexrgb('#f2a24e'), hexrgb('#9e2f22')
WHITE = (1.0, 1.0, 1.0)
BOURBON = hexrgb('#5a1f06')
BOURBON_SURFACE = hexrgb('#c4651c')
ICE = hexrgb('#eef7ff')

def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

# Glass geometry (unit square, y down)
TOP_Y, BOTTOM_Y = 0.22, 0.80
TOP_L, TOP_R = 0.20, 0.80
BOT_L, BOT_R = 0.26, 0.74
WALL, BASE = 0.035, 0.085
CORNER = 0.05
LIQUID_Y = 0.46
CUBE = (0.385, 0.375, 0.615, 0.605)  # x0, y0, x1, y1
CUBE_EDGE = 0.014

def side_x(y, left, inset=0.0):
    t = (y - TOP_Y) / (BOTTOM_Y - TOP_Y)
    x = TOP_L + (BOT_L - TOP_L) * t if left else TOP_R + (BOT_R - TOP_R) * t
    return x + inset if left else x - inset

def in_glass(x, y, inset=0.0, base=0.0):
    top = TOP_Y
    bottom = BOTTOM_Y - base
    if not (top <= y <= bottom):
        return False
    l, r = side_x(y, True, inset), side_x(y, False, inset)
    if not (l <= x <= r):
        return False
    # rounded bottom corners on the outer shape
    if base == 0 and y > bottom - CORNER:
        for cx in (l + CORNER, r - CORNER):
            if (x < l + CORNER and cx == l + CORNER) or (x > r - CORNER and cx == r - CORNER):
                if (x - cx) ** 2 + (y - (bottom - CORNER)) ** 2 > CORNER ** 2:
                    return False
    return True

def color_at(x, y):
    t = x * 0.4 + y * 0.6
    c = mix(TOP, BOTTOM, t)
    if not in_glass(x, y):
        return c
    inner = in_glass(x, y, WALL, BASE)
    if not inner:
        return mix(c, WHITE, 0.92)  # walls and heavy base
    # inside the glass
    c = mix(c, WHITE, 0.12)
    in_liquid = y >= LIQUID_Y
    if in_liquid:
        c = mix(c, BOURBON, 0.82)
        if y < LIQUID_Y + 0.012:
            c = mix(c, BOURBON_SURFACE, 0.9)
    x0, y0, x1, y1 = CUBE
    if x0 <= x <= x1 and y0 <= y <= y1:
        edge = min(x - x0, x1 - x, y - y0, y1 - y) < CUBE_EDGE
        if edge:
            c = mix(c, WHITE, 0.95)
        else:
            c = mix(c, ICE, 0.45 if in_liquid else 0.7)
            # highlight in the top-left of the cube
            if x0 + 0.035 <= x <= x0 + 0.075 and y0 + 0.035 <= y <= y0 + 0.11:
                c = mix(c, WHITE, 0.8)
    # rim shine on the left wall
    return c

def render(size, path):
    rows = []
    n = SS * SS
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    c = color_at((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size)
                    r += c[0]; g += c[1]; b += c[2]
            row += bytes((round(r / n * 255), round(g / n * 255), round(b / n * 255)))
        rows.append(bytes(row))

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

os.makedirs(OUT, exist_ok=True)
targets = [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]
if SIZES:
    targets = [(s, f'preview-{s}.png') for s in SIZES]
for size, name in targets:
    render(size, os.path.join(OUT, name))
    print('wrote', name)
