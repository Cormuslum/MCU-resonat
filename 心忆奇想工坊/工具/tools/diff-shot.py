# -*- coding: utf-8 -*-
"""对比两张 1920x1080 截图：MAE + 差异热力图 + 分区 MAE。"""
import sys, numpy as np
from PIL import Image

def load(p, size=(1920, 1080)):
    im = Image.open(p).convert('RGB')
    if im.size != size:
        cv = Image.new('RGB', size, (0, 0, 0))
        cv.paste(im, (0, 0))
        im = cv
    return np.asarray(im).astype(np.int16)

a = load(sys.argv[1])
b = load(sys.argv[2])
out = sys.argv[3] if len(sys.argv) > 3 else None

d = np.abs(a - b).mean(axis=2)
print('FULL MAE = %.2f' % d.mean())

REGIONS = {
    '背景/左上':      (0, 0, 430, 250),
    '卡片区':         (400, 240, 900, 870),
    '左侧弧线':       (300, 250, 470, 700),
    '属性面板':       (960, 330, 1650, 690),
    '右侧装饰':       (1540, 60, 1920, 620),
    '右下圆环':       (1550, 730, 1900, 1060),
    '额外获得条':     (0, 850, 620, 1010),
    '右上跳过':       (1650, 0, 1920, 120),
    '底部提示':       (1380, 1000, 1900, 1060),
    '右上罗盘':       (1080, 60, 1920, 960),
}
for k, (x0, y0, x1, y1) in REGIONS.items():
    print('  %-10s %6.2f' % (k, d[y0:y1, x0:x1].mean()))

if out:
    heat = np.zeros((1080, 1920, 3), np.uint8)
    heat[..., 0] = np.clip(d * 6, 0, 255)
    heat[..., 1] = np.clip(d * 1.2, 0, 255)
    Image.fromarray(heat).save(out)
    # 并排对照
    sbs = Image.new('RGB', (1920, 1080))
    sbs.paste(Image.fromarray(a.astype(np.uint8)).resize((960, 540)), (0, 0))
    sbs.paste(Image.fromarray(b.astype(np.uint8)).resize((960, 540)), (960, 0))
    sbs.paste(Image.fromarray(heat).resize((960, 540)), (480, 540))
    sbs.save(out.replace('.png', '-sbs.png'))
    print('已写出', out)
