"""Fast local preview of the slime rows before pushing them through MCP."""

import math
import os

from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
BOX_W = 20
LEGEND = {
    ".": (0, 0, 0, 0),
    "o": (18, 19, 31, 255),
    "B": (63, 163, 77, 255),
    "L": (140, 235, 154, 255),
    "D": (36, 92, 44, 255),
    "W": (242, 255, 244, 255),
    "K": (18, 19, 31, 255),
}


def slime_rows(height: int, maxw: float) -> list[str]:
    # One transparent ring around the body so the outline can close all round.
    w = BOX_W + 2
    h = height + 2
    cx = (w - 1) / 2.0
    g = [["." for _ in range(w)] for _ in range(h)]

    # Dome profile: narrow at the top, full width at the base.
    for y in range(height):
        t = (y + 1) / height
        hw = maxw * math.sqrt(max(0.0, t * (2.0 - t)))
        for x in range(w):
            if abs(x - cx) <= hw + 1e-9:
                g[y + 1][x] = "B"

    # Shade: an oval highlight in the upper left, shadow on the right rim
    # and along the ground contact.
    lx, ly = cx - 2.4, height * 0.22 + 1
    rx, ry = maxw * 0.32, max(1.0, height * 0.10)
    for y in range(h):
        ny = (y - 0.5) / height * 2.0 - 1.0
        for x in range(w):
            if g[y][x] != "B":
                continue
            nx = (x - cx) / max(0.1, maxw)
            in_spot = ((x - lx) / rx) ** 2 + ((y - ly) / ry) ** 2 <= 1.0
            if in_spot and y > 1:
                g[y][x] = "L"
            elif ny > 0.84 or (nx > 0.62 and ny > 0.05):
                g[y][x] = "D"

    # Eyes: 2x2 block with a single glint pixel, mirrored about the centre.
    eye_y = max(1, int(height * 0.40)) + 1
    for ex in (round(cx - 3.5), round(cx + 2.5)):
        for oy in (0, 1):
            for ox in (0, 1):
                y, x = eye_y + oy, ex + ox
                if 0 <= y < h and 0 <= x < w and g[y][x] != ".":
                    g[y][x] = "W" if (ox == 0 and oy == 0) else "K"

    # Small mouth two rows under the eyes, centred between them.
    my = eye_y + 3
    if my < h:
        for x in (int(cx) - 1, int(cx), int(cx) + 1):
            if 0 <= x < w and g[my][x] != ".":
                g[my][x] = "K"

    # 1 px outline outside the body.
    out = [row[:] for row in g]
    for y in range(h):
        for x in range(w):
            if g[y][x] != ".":
                continue
            for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + oy, x + ox
                if 0 <= ny < h and 0 <= nx < w and g[ny][nx] != ".":
                    out[y][x] = "o"
                    break

    return ["".join(r) for r in out]


POSES = [(15, 7.6), (10, 8.8), (18, 6.3)]


def render(rows, scale=14, grid=True):
    h, w = len(rows), len(rows[0])
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            img.putpixel((x, y), LEGEND[ch])
    big = img.resize((w * scale, h * scale), Image.NEAREST)
    # checkerboard behind
    bg = Image.new("RGBA", big.size, (255, 255, 255, 255))
    for yy in range(0, big.size[1], scale):
        for xx in range(0, big.size[0], scale):
            if (xx // scale + yy // scale) % 2 == 0:
                bg.paste((228, 228, 228, 255), (xx, yy, xx + scale, yy + scale))
    bg.alpha_composite(big)
    if grid:
        for i in range(w + 1):
            for yy in range(bg.size[1]):
                bg.putpixel((min(i * scale, bg.size[0] - 1), yy), (150, 150, 150, 255))
        for j in range(h + 1):
            for xx in range(bg.size[0]):
                bg.putpixel((xx, min(j * scale, bg.size[1] - 1)), (150, 150, 150, 255))
    return bg


def main():
    tiles = [render(slime_rows(h, mw)) for h, mw in POSES]
    gap = 16
    W = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
    H = max(t.height for t in tiles)
    sheet = Image.new("RGBA", (W, H), (40, 42, 54, 255))
    x = 0
    for t in tiles:
        sheet.alpha_composite(t, (x, H - t.height))
        x += t.width + gap
    path = os.path.join(OUT, "draft.png")
    sheet.save(path)
    print(path, sheet.size)
    for i, (h, mw) in enumerate(POSES):
        for row in slime_rows(h, mw):
            print(f"  f{i+1} |{row}|")
        print()


if __name__ == "__main__":
    main()
