"""End-to-end check of the Aseprite MCP server over real stdio JSON-RPC."""

import asyncio
import base64
import os
import sys
import tempfile

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from design import slime_rows

REPO = r"C:\Users\Administrator\tools\aseprite-mcp"
UV = r"C:\Users\Administrator\.local\bin\uv.exe"
ASE = r"C:\Users\Administrator\Desktop\aseprite-windows-x64-v1.3.16\aseprite.exe"
OUT = os.environ.get("ASEPRITE_EXAMPLE_OUT") or tempfile.mkdtemp(prefix="aseprite-example-")
SPR = os.path.join(OUT, "slime.aseprite")

# draw_rows wants single-char -> hex string; "." stays untouched.
LEGEND = {
    ".": None,
    "o": "#12131f",
    "B": "#3fa34d",
    "L": "#8ceb9a",
    "D": "#245c2c",
    "W": "#f2fff4",
    "K": "#12131f",
}

CANVAS_W, CANVAS_H = 32, 32
BOX_W = 22              # drawing box width, must match design.BOX_W + 2
PAD_X = (CANVAS_W - BOX_W) // 2
GROUND_Y = 26           # every pose sits on this row

# (body height, half width, frame duration ms)
POSES = [(15, 7.6, 130), (10, 8.8, 70), (18, 6.3, 90)]


def text_of(result) -> str:
    bits = [getattr(c, "text", "") for c in result.content if getattr(c, "text", None)]
    return "\n".join(bits) if bits else f"<{len(result.content)} non-text block(s)>"


def save_images(result, stem: str) -> list[str]:
    saved = []
    for i, c in enumerate(result.content):
        data = getattr(c, "data", None)
        if not data:
            continue
        path = os.path.join(OUT, f"{stem}_{i}.png")
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(data))
        saved.append(path)
    return saved


async def call(s, name, **args):
    res = await s.call_tool(name, args)
    imgs = save_images(res, name)
    print(f"\n[{name}] -> {text_of(res)[:600]}")
    for p in imgs:
        print(f"    image: {p}")
    return res


async def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    for stale in os.listdir(OUT):
        if stale.startswith(("slime", "preview", "view_sprite")):
            os.remove(os.path.join(OUT, stale))

    params = StdioServerParameters(
        command=UV,
        args=["--directory", REPO, "run", "-m", "aseprite_mcp"],
        env={**os.environ, "ASEPRITE_PATH": ASE, "PYTHONUTF8": "1"},
        cwd=REPO,
    )

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as s:
            info = await s.initialize()
            print(f"SERVER OK: {info.serverInfo.name} v{info.serverInfo.version}")
            print(f"TOOLS EXPOSED: {len((await s.list_tools()).tools)}")

            await call(s, "create_canvas", width=CANVAS_W, height=CANVAS_H, filename=SPR)
            await call(s, "add_layer", filename=SPR, layer_name="slime")
            await call(s, "delete_layer", filename=SPR, layer_name="Layer 1")

            for i, (h, hw, ms) in enumerate(POSES):
                if i > 0:
                    await call(s, "add_frames", filename=SPR, count=1, duration_ms=ms)
                    # add_frames duplicates the previous cel: drop it, or the
                    # old pose shows through wherever the new rows are shorter.
                    await call(s, "clear_cel", filename=SPR, layer_name="slime",
                               frame_index=i + 1)
                await call(s, "set_frame_duration",
                           filename=SPR, frame_index=i + 1, duration_ms=ms)
                rows = slime_rows(h, hw)
                print(f"    pose {i + 1}: {len(rows)} rows x {len(rows[0])} px")
                await call(s, "draw_rows", filename=SPR, layer_name="slime",
                           frame_index=i + 1, x=PAD_X, y=GROUND_Y - h - 1,
                           rows=rows, legend=LEGEND)

            await call(s, "get_sprite_info", filename=SPR)
            for f in (1, 2, 3):
                await call(s, "get_color_stats", filename=SPR, frame_index=f)
                await call(s, "lint_sprite", filename=SPR, frame_index=f)
            await call(s, "audit_animation", filename=SPR)
            await call(s, "get_bounds", filename=SPR, frames="1-3")
            await call(s, "compare_frames", filename=SPR, frame_a=1, frame_b=2)

            await call(s, "view_sprite", filename=SPR, frames="1-3", scale=9,
                       output_filename=os.path.join(OUT, "preview_all.png"))
            await call(s, "view_sprite", filename=SPR, frames="1", scale=20,
                       region="10,12,14,12",
                       output_filename=os.path.join(OUT, "preview_face.png"))
            await call(s, "export_spritesheet", filename=SPR,
                       output_filename=os.path.join(OUT, "slime_sheet.png"),
                       sheet_type="horizontal", scale=6)
            await call(s, "export_animation", filename=SPR,
                       output_filename=os.path.join(OUT, "slime.gif"),
                       scale=6, background="#1a1c2c")

            print("\nDONE")
            sys.stdout.flush()
            # stdio_client's aexit blocks on Windows; leave before it runs.
            os._exit(0)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    asyncio.run(main())
