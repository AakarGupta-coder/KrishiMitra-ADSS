"""Assemble the silent 5:30 KrishiMitra demonstration video.

00:00-02:00  PowerPoint slide-show capture (original slides, with a moving highlight ring).
02:00-05:30  Real-time capture of the running website, with a caption band below the page.

Usage: python build_demo_video.py <ppt_capture.mkv> <run_dir> <output.mp4> [subtitle_dir]

With subtitle_dir the slide section is shrunk to 95 % so one caption line sits below the slide and covers nothing.
Without it the output is the original full-bleed silent build.
"""
import bisect
import json
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FPS = 30
PPT_FRAMES = 120 * FPS
WEB_FRAMES = 210 * FPS
W, H = 1920, 1080
PPT_SKIP = 91          # first transition lands exactly on 00:12
FADE = 0.30            # caption and page dissolve, seconds
CROSS = 15             # slide-to-website dissolve, frames
CLOSING_AT = 204.0
GOLD = (75, 176, 227)  # BGR
# Nominatim answered 0.3 s before the next step: skip part of that wait and hold its real results on screen.
SEARCH_HOLD = (169.4, 170.4, 170.3)

# Highlight rings: (slide start s, offset in, offset out, x0, y0, x1, y1) in 1920x1080 slide coordinates.
S2, S3, S4, S5, S6, S7, S8 = 12, 27, 45, 62, 82, 99, 111
RINGS = [
    (S2, 2.0, 7.4, 85, 265, 851, 961), (S2, 7.4, 12.0, 921, 266, 1844, 914), (S2, 12.0, 14.7, 921, 928, 1844, 1002),
    (S3, 2.0, 4.6, 72, 208, 1844, 347), (S3, 4.6, 7.2, 72, 377, 1844, 515), (S3, 7.2, 9.8, 72, 546, 728, 858),
    (S3, 9.8, 12.4, 763, 546, 1333, 858), (S3, 12.4, 15.0, 1367, 546, 1845, 858), (S3, 15.0, 17.7, 72, 881, 1843, 971),
    (S4, 2.0, 5.4, 85, 258, 937, 583), (S4, 5.4, 8.8, 985, 258, 1844, 583), (S4, 8.8, 12.0, 86, 619, 1858, 727),
    (S4, 12.0, 14.6, 85, 763, 1843, 923), (S4, 14.6, 16.7, 370, 936, 1560, 974),
    (S5, 2.0, 7.4, 85, 215, 836, 953), (S5, 7.4, 12.6, 885, 215, 1837, 685), (S5, 12.6, 16.0, 885, 705, 1844, 815),
    (S5, 16.0, 19.7, 885, 835, 1844, 959),
    (S6, 2.0, 5.0, 85, 258, 922, 505), (S6, 5.0, 8.6, 85, 540, 922, 842), (S6, 8.6, 12.0, 978, 258, 1842, 518),
    (S6, 12.0, 14.2, 978, 553, 1844, 720), (S6, 14.2, 16.7, 978, 741, 1844, 959),
    (S7, 2.0, 5.0, 84, 214, 996, 850), (S7, 5.0, 8.6, 1025, 225, 1830, 740), (S7, 8.6, 11.7, 1021, 762, 1844, 959),
    (S8, 1.8, 3.8, 85, 258, 937, 725), (S8, 3.8, 5.8, 993, 258, 1844, 724), (S8, 5.8, 8.4, 86, 763, 1843, 1001),
]


def ring_patch(x0, y0, x1, y1, pad=7, margin=26):
    """Anti-aliased rounded ring with a soft glow, as a BGR patch and alpha mask."""
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    bx0, by0 = max(0, x0 - margin), max(0, y0 - margin)
    bx1, by1 = min(W, x1 + margin), min(H, y1 + margin)
    s = 3
    im = Image.new('L', ((bx1 - bx0) * s, (by1 - by0) * s), 0)
    d = ImageDraw.Draw(im)
    box = [(x0 - bx0) * s, (y0 - by0) * s, (x1 - bx0) * s, (y1 - by0) * s]
    d.rounded_rectangle(box, radius=18 * s, outline=255, width=5 * s)
    sharp = im.resize((bx1 - bx0, by1 - by0), Image.LANCZOS)
    glow = sharp.filter(ImageFilter.GaussianBlur(7))
    a = np.maximum(np.asarray(sharp, np.float32) / 255, np.asarray(glow, np.float32) / 255 * 0.55)
    return (bx0, by0, bx1, by1), a[..., None]


def rgba(path):
    im = np.asarray(Image.open(path).convert('RGBA'), np.float32)
    return im[..., 2::-1], im[..., 3:] / 255


def bgr(path):
    return cv2.imread(path, cv2.IMREAD_COLOR)


def ramp(t, start, end, fade):
    """0..1 envelope for an overlay visible between start and end."""
    if t < start or t > end:
        return 0.0
    return min(1.0, (t - start) / fade, (end - t) / fade)


class Web:
    def __init__(self, run):
        self.run = run
        cap = json.load(open(os.path.join(run, 'capture.json'), encoding='utf8'))
        self.t0 = cap['t0']
        self.ts = [f['ts'] for f in cap['frames']]
        self.events = cap['events']
        self.cached = (-1, None)
        self.nav = [e['t'] for e in self.events if e['type'] == 'mark' and e['name'] == 'nav']
        self.captions = json.load(open(os.path.join(run, 'post', 'captions.json'), encoding='utf8'))
        for c in self.captions:
            c['img'] = bgr(os.path.join(run, 'post', c['file']))
        self.band_h = self.captions[0]['img'].shape[0]
        self.page_h = H - self.band_h
        mark = {e['name']: e['t'] for e in self.events if e['type'] == 'mark'}
        self.pdf_start, self.pdf_end = mark['pdf_preview_start'] + 0.25, mark['pdf_preview_end'] + 0.2

    def frame(self, t):
        if SEARCH_HOLD[0] <= t < SEARCH_HOLD[1]:
            t = SEARCH_HOLD[2]
        i = max(0, bisect.bisect_right(self.ts, self.t0 + t) - 1)
        if i != self.cached[0]:
            im = cv2.imread(os.path.join(self.run, 'frames', f'{i:06d}.jpg'), cv2.IMREAD_COLOR)
            self.cached = (i, im[: self.page_h, : W].copy())
        return self.cached[1]

    def band(self, t):
        ts = [c['t'] for c in self.captions]
        i = max(0, bisect.bisect_right(ts, t) - 1)
        cur = self.captions[i]['img']
        a = (t - ts[i]) / FADE
        if i == 0 or a >= 1:
            return cur
        return cv2.addWeighted(cur, a, self.captions[i - 1]['img'], 1 - a, 0)


class Subtitles:
    """Narrated layout for the slide section. Rings are already on the frame, so they shrink with the slide."""
    SLIDE_W, SLIDE_H = 1824, 1026
    GROUND = (43, 56, 20)  # BGR of the caption band colour
    FADE = 0.10

    def __init__(self, folder):
        self.cues = json.load(open(os.path.join(folder, 'cues.json'), encoding='utf8'))
        for c in self.cues:
            c['img'] = bgr(os.path.join(folder, c['file']))
        self.left = (W - self.SLIDE_W) // 2
        self.strip_h = H - self.SLIDE_H

    def frame(self, f, t):
        canvas = np.full((H, W, 3), self.GROUND, np.uint8)
        canvas[: self.SLIDE_H, self.left : self.left + self.SLIDE_W] = cv2.resize(f, (self.SLIDE_W, self.SLIDE_H), interpolation=cv2.INTER_AREA)
        for c in self.cues:
            a = ramp(t, c['start'], c['end'], self.FADE)
            if a > 0:
                strip = canvas[self.SLIDE_H :]
                canvas[self.SLIDE_H :] = cv2.addWeighted(c['img'], a, strip, 1 - a, 0)
                break
        return canvas


def pdf_inset(run, page_h):
    """Two real pages of the PDF the app generated during the recording, on a soft shadow."""
    pages = sorted(f for f in os.listdir(os.path.join(run, 'post')) if f.startswith('pdf_page'))[:2]
    h = 760
    canvas = Image.new('RGBA', (W, page_h), (0, 0, 0, 0))
    x = 300
    for f in pages:
        p = Image.open(os.path.join(run, 'post', f)).convert('RGBA')
        p = p.resize((int(p.width * h / p.height), h), Image.LANCZOS)
        y = (page_h - h) // 2 + 24
        sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([x - 2, y - 2, x + p.width + 2, y + h + 2], 6, fill=(13, 42, 32, 150))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
        canvas.alpha_composite(p, (x, y))
        x += p.width + 34
    im = np.asarray(canvas, np.float32)
    return im[..., 2::-1], im[..., 3:] / 255


def main():
    ppt_path, run, out = sys.argv[1:4]
    subs = Subtitles(sys.argv[4]) if len(sys.argv) > 4 else None
    web = Web(run)
    title_c, title_a = rgba(os.path.join(run, 'post', 'title.png'))
    closing = bgr(os.path.join(run, 'post', 'closing.png')).astype(np.float32)
    inset_c, inset_a = pdf_inset(run, web.page_h)
    rings = [(s + a, s + b, *ring_patch(x0, y0, x1, y1)) for s, a, b, x0, y0, x1, y1 in RINGS]
    ring_color = np.array((58, 87, 184), np.float32)  # rust accent from the deck

    ff = subprocess.Popen([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-an', '-map_metadata', '-1',
        '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-fps_mode', 'cfr', '-movflags', '+faststart', out,
    ], stdin=subprocess.PIPE)

    def compose_web(t):
        canvas = np.zeros((H, W, 3), np.uint8)
        page = web.frame(t)
        for tn in web.nav:
            if tn <= t < tn + FADE:
                before = web.frame(tn - 1 / FPS).copy()
                page = cv2.addWeighted(web.frame(t), (t - tn) / FADE, before, 1 - (t - tn) / FADE, 0)
                break
        canvas[: web.page_h] = page
        canvas[web.page_h :] = web.band(t)
        canvas[web.page_h : web.page_h + 3, : int(W * min(1, t / 210))] = GOLD
        a = ramp(t, web.pdf_start, web.pdf_end, 0.3)
        if a > 0:
            region = canvas[: web.page_h].astype(np.float32)
            m = inset_a * a
            canvas[: web.page_h] = (inset_c * m + region * (1 - m)).astype(np.uint8)
        a = ramp(t, 0.0, 2.7, 0.35)
        if t < 0.35:
            a = 1.0
        if a > 0:
            m = title_a * a
            canvas[:] = (title_c * m + canvas * (1 - m)).astype(np.uint8)
        if t >= CLOSING_AT:
            a = min(1.0, (t - CLOSING_AT) / 0.8)
            canvas[:] = (closing * a + canvas * (1 - a)).astype(np.uint8)
        return canvas

    cap = cv2.VideoCapture(ppt_path)
    for _ in range(PPT_SKIP):
        cap.grab()
    first_web = compose_web(0.0)
    for n in range(PPT_FRAMES):
        ok, f = cap.read()
        if not ok:
            raise RuntimeError(f'slide capture ended at frame {n}')
        t = n / FPS
        for start, end, (x0, y0, x1, y1), mask in rings:
            a = ramp(t, start, end, 0.35)
            if a > 0:
                m = mask * a
                roi = f[y0:y1, x0:x1].astype(np.float32)
                f[y0:y1, x0:x1] = (ring_color * m + roi * (1 - m)).astype(np.uint8)
        if subs:
            f = subs.frame(f, t)
        if n >= PPT_FRAMES - CROSS:
            a = (n - (PPT_FRAMES - CROSS) + 1) / CROSS
            f = cv2.addWeighted(first_web, a, f, 1 - a, 0)
        ff.stdin.write(f.tobytes())
        if n % 600 == 0:
            print(f'ppt {n / FPS:.0f}s', flush=True)
    cap.release()

    for n in range(WEB_FRAMES):
        ff.stdin.write(compose_web(n / FPS).tobytes())
        if n % 600 == 0:
            print(f'web {n / FPS:.0f}s', flush=True)
    ff.stdin.close()
    ff.wait()
    print('done', out, ff.returncode)


if __name__ == '__main__':
    main()
