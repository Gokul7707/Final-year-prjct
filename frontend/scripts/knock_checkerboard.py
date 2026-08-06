"""True-alpha cutouts from checkerboard-baked PNGs (simple rembg, no hole-punching)."""
from __future__ import annotations

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

CUT = Path(__file__).resolve().parents[1] / "public" / "drones" / "cutouts"
RAW = Path(__file__).resolve().parents[1] / "public" / "drones" / "raw"

TARGETS = [
    "hero-flagship.png",
    "series-velocity.png",
    "series-cinema.png",
    "series-imaging.png",
    "series-cargo.png",
    "series-enterprise.png",
]

ALIASES = {
    "login-float.png": "hero-flagship.png",
    "icon-imaging.png": "hero-flagship.png",
    "icon-velocity.png": "series-velocity.png",
    "icon-enterprise.png": "series-enterprise.png",
}

# isnet handles product cutouts better than u2net for mixed checkers
try:
    SESSION = new_session("isnet-general-use")
    print("session: isnet-general-use", flush=True)
except Exception:
    SESSION = new_session("u2net")
    print("session: u2net", flush=True)


def erase_checker_everywhere(im: Image.Image) -> Image.Image:
    """Remove gray/white checker tiles by local tile prediction (keeps colored subject)."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    h, w, _ = rgb.shape

    # Fixed common PNG-checker sizes: try 8,10,16
    best_mask = None
    best_count = -1
    for cell in (8, 10, 12, 16, 20):
        # tile colors sampled from border band
        border = np.concatenate(
            [
                rgb[0:cell, :].reshape(-1, 3),
                rgb[-cell:, :].reshape(-1, 3),
                rgb[:, 0:cell].reshape(-1, 3),
                rgb[:, -cell:].reshape(-1, 3),
            ],
            axis=0,
        )
        # two clusters via percentiles
        c_light = np.percentile(border, 85, axis=0)
        c_dark = np.percentile(border, 25, axis=0)

        yy, xx = np.mgrid[0:h, 0:w]
        bit = ((xx // cell) + (yy // cell)) % 2
        expected = np.zeros_like(rgb)
        expected[bit == 0] = c_light
        expected[bit == 1] = c_dark
        dist = np.abs(rgb - expected).sum(axis=2)
        expected2 = np.zeros_like(rgb)
        expected2[bit == 0] = c_dark
        expected2[bit == 1] = c_light
        dist = np.minimum(dist, np.abs(rgb - expected2).sum(axis=2))

        sat = rgb.max(axis=2) - rgb.min(axis=2)
        # Only desaturated pixels can be checker; colored drone parts stay
        mask = (sat <= 28) & (dist <= 55) & (rgb.min(axis=2) >= 140)
        count = int(mask.sum())
        if count > best_count:
            best_count = count
            best_mask = mask
            best_cell = cell

    print(f"  checker cell~{best_cell}px removed={best_count}", flush=True)
    arr[best_mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def composite_on(im: Image.Image, color=(180, 190, 200)) -> Image.Image:
    """Put cutout on flat color so rembg sees a clean background."""
    base = Image.new("RGBA", im.size, (*color, 255))
    return Image.alpha_composite(base, im.convert("RGBA"))


def process(name: str) -> None:
    src = RAW / name
    print(f"processing {name} ...", flush=True)
    original = Image.open(src).convert("RGBA")

    # 1) knock checker to alpha
    knocked = erase_checker_everywhere(original)
    # 2) put on flat gray for rembg
    flat = composite_on(knocked, (186, 196, 206))

    buf = io.BytesIO()
    flat.save(buf, format="PNG")
    out_bytes = remove(buf.getvalue(), session=SESSION)
    out = Image.open(io.BytesIO(out_bytes)).convert("RGBA")

    # 3) remove residual flat gray
    arr = np.array(out)
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    dist = np.abs(rgb - np.array([186, 196, 206])).sum(axis=2)
    leftover = (a > 0) & (sat <= 20) & (rgb.min(axis=2) >= 150) & (dist <= 48)
    arr[leftover, 3] = 0
    out = Image.fromarray(arr, "RGBA")

    # light edge clean
    out.putalpha(out.getchannel("A").filter(ImageFilter.MedianFilter(3)))

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
        pad = 24
        canvas = Image.new("RGBA", (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(out, (pad, pad), out)
        out = canvas

    out.save(CUT / name, "PNG", optimize=True)
    alphas = np.array(out.getchannel("A"))
    print(
        f"  -> {out.size} transparent={(alphas == 0).sum()} solid={(alphas > 240).sum()}",
        flush=True,
    )


def main() -> None:
    for name in TARGETS:
        process(name)
    for dst, src in ALIASES.items():
        Image.open(CUT / src).save(CUT / dst, "PNG")
        print(f"alias {dst} <- {src}", flush=True)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
