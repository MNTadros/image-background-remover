import cv2
import numpy as np
import sys
import json
import os
from typing import Tuple, Dict

def load_image(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Unable to read image at {path}")
    return img

def compute_grabcut_rect(shape: Tuple[int, int], inset_pct: float = 0.01) -> Tuple[int, int, int, int]:
    h, w = shape
    dx = max(1, int(w * inset_pct))
    dy = max(1, int(h * inset_pct))
    return dx, dy, w - 2 * dx, h - 2 * dy

def grabcut_mask(img: np.ndarray, rect: Tuple[int, int, int, int], iter_count: int = 5) -> np.ndarray:
    mask = np.zeros(img.shape[:2], np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, rect, bgd_model, fgd_model, iter_count, cv2.GC_INIT_WITH_RECT)
    fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype("uint8")
    return fg_mask

def add_alpha_channel(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    b, g, r = cv2.split(img)
    alpha = (mask * 255).astype("uint8")
    return cv2.merge([b, g, r, alpha])

def remove_background(img: np.ndarray, iter_count: int = 5) -> np.ndarray:
    rect = compute_grabcut_rect(img.shape[:2])
    fg_mask = grabcut_mask(img, rect, iter_count)
    return add_alpha_channel(img, fg_mask)

def save_image(path: str, img: np.ndarray):
    ok = cv2.imwrite(path, img)
    if not ok:
        raise IOError(f"Failed to write image to {path}")

def process_image(input_path: str, output_path: str) -> Dict:
    img = load_image(input_path)
    base, _ = os.path.splitext(output_path)
    out_png = base + ".png"
    rgba = remove_background(img)
    save_image(out_png, rgba)
    h, w = img.shape[:2]
    return {"success": True, "output_path": out_png, "width": w, "height": h}

def main():
    if len(sys.argv) != 3:
        print("Usage: python bg_remover.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    inp, outp = sys.argv[1], sys.argv[2]
    try:
        result = process_image(inp, outp)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
