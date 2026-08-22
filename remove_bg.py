from PIL import Image
import os

def remove_black_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # 用亮度判断：纯黑→透明，深色→半透明（平滑边缘），其余→不透明
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            if luminance >= 28:
                alpha = 255
            else:
                alpha = int(luminance * 9)  # 0→0, 28→252
                if alpha > 255:
                    alpha = 255
            pixels[x, y] = (r, g, b, alpha)
    img.save(output_path, "PNG")
    print(f"  {os.path.basename(output_path)} ({w}x{h})")

base = r"C:\Users\13693\Doubao\chats\2026-08-22\new-chat\website"
files = ["chibi-normal", "chibi-happy", "chibi-shy", "chibi-sleepy", "chibi-surprised"]

print("Processing images...")
for name in files:
    src = os.path.join(base, name + ".jpg")
    dst = os.path.join(base, name + ".png")
    remove_black_bg(src, dst)
print("Done!")
