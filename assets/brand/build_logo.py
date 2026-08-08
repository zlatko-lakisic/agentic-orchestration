import math, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen

OUT = "/home/claude/brand"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- geometry
CX, CY, R = 128.0, 118.0, 80.0
ARC_W, A_W = 21.0, 24.0          # arc 14 : A 16, scaled by 80/54
TH_START, TH_END = 50.0, 138.0   # degrees; sweep runs clockwise start -> end
APEX = (128.0, 38.0)
FOOT_L, FOOT_R = (81.5, 213.0), (174.5, 213.0)
BAR_Y, BAR_X0, BAR_X1 = 145.0, 100.0, 156.0
YSHIFT = 2.5                     # centres the bbox in a 256 box


def pt(th):
    r = math.radians(th)
    return (CX + R * math.cos(r), CY - R * math.sin(r))


def arc_path(th_start=TH_START, th_end=TH_END):
    x0, y0 = pt(th_start)
    x1, y1 = pt(th_end)
    sweep = (th_start - th_end) % 360
    large = 1 if sweep > 180 else 0
    return f"M {x0:.2f} {y0:.2f} A {R} {R} 0 {large} 1 {x1:.2f} {y1:.2f}"


def head_path(th_end=TH_END, w=ARC_W, length_k=1.95, width_k=1.20):
    """Arrowhead drawn as its own triangle, tangent to the sweep."""
    r = math.radians(th_end)
    ex, ey = pt(th_end)
    tx, ty = math.sin(r), math.cos(r)      # clockwise tangent, screen coords
    nx, ny = -ty, tx                       # left normal
    L, H = length_k * w, width_k * w
    tip = (ex + L * tx, ey + L * ty)
    b1 = (ex + H * nx, ey + H * ny)
    b2 = (ex - H * nx, ey - H * ny)
    return (f"M {tip[0]:.2f} {tip[1]:.2f} L {b1[0]:.2f} {b1[1]:.2f} "
            f"L {b2[0]:.2f} {b2[1]:.2f} Z")


def a_legs(apex=APEX, fl=FOOT_L, fr=FOOT_R):
    return (f"M {fl[0]:.2f} {fl[1]:.2f} L {apex[0]:.2f} {apex[1]:.2f} "
            f"L {fr[0]:.2f} {fr[1]:.2f}")


def a_bar(y=BAR_Y, x0=BAR_X0, x1=BAR_X1):
    return f"M {x0:.2f} {y:.2f} L {x1:.2f} {y:.2f}"


def mark_group(uid, arc_w=ARC_W, a_w=A_W, bar_y=BAR_Y, bar_x0=BAR_X0,
               bar_x1=BAR_X1, gap=12.0, color="currentColor", th_end=TH_END,
               head_len=1.9, head_wid=1.05):
    """Arc + head masked where the A crosses, then the A on top."""
    cut = a_w + gap * 2
    return f'''  <defs>
    <mask id="cut-{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
      <rect x="0" y="0" width="256" height="256" fill="white"/>
      <path d="{a_legs()}" fill="none" stroke="black" stroke-width="{cut:.1f}"
            stroke-linecap="round" stroke-linejoin="round"/>
    </mask>
  </defs>
  <g transform="translate(0 {YSHIFT})">
    <g mask="url(#cut-{uid})">
      <path d="{arc_path(th_end=th_end)}" fill="none" stroke="{color}"
            stroke-width="{arc_w}" stroke-linecap="round"/>
      <path d="{head_path(th_end=th_end, w=arc_w, length_k=head_len, width_k=head_wid)}" fill="{color}"/>
    </g>
    <g fill="none" stroke="{color}" stroke-width="{a_w}"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="{a_legs()}"/>
      <path d="{a_bar(bar_y, bar_x0, bar_x1)}"/>
    </g>
  </g>'''


def svg(body, w=256, h=256, vb="0 0 256 256", extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'width="{w}" height="{h}" fill="none" role="img">{extra}\n{body}\n</svg>\n')


# ---------------------------------------------------------------- wordmark
FONT = "/home/claude/fuse_extract/fuse/public/fonts/geist/Geist.woff2"


def glyph_paths(text, weight=600, size=100.0, tracking=0.0):
    """Return (path_d, advance_width) for text at the given weight/size."""
    f = TTFont(FONT)
    inst = instancer.instantiateVariableFont(f, {"wght": weight}, inplace=False)
    upem = inst["head"].unitsPerEm
    gs = inst.getGlyphSet()
    cmap = inst.getBestCmap()
    hmtx = inst["hmtx"]
    scale = size / upem
    d, x = [], 0.0
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += size * 0.4
            continue
        pen = SVGPathPen(gs)
        gs[gname].draw(pen)
        cmds = pen.getCommands()
        if cmds:
            d.append(f'<path transform="translate({x:.2f} 0) scale({scale:.5f} {-scale:.5f})" '
                     f'd="{cmds}"/>')
        x += hmtx[gname][0] * scale + tracking
    return "\n      ".join(d), x - tracking


CAP = 0.70  # Geist cap height as a fraction of em


def wordmark(size_top, size_bot, track_top, track_bot, color="currentColor"):
    top, w_top = glyph_paths("AGENTIC", 600, size_top, track_top)
    bot, w_bot = glyph_paths("ORCHESTRATION", 500, size_bot, track_bot)
    return top, w_top, bot, w_bot, color


# ---------------------------------------------------------------- outputs
files = {}

# 1. primary mark
files["ao-mark.svg"] = svg(mark_group("m"))

# 2. small-size mark: lower bar (wider counter), fatter cuts, stubbier head
small = mark_group("s", arc_w=20, a_w=24, bar_y=153, bar_x0=96, bar_x1=160,
                   gap=16.0, head_len=1.7, head_wid=1.15)
files["ao-mark-small.svg"] = svg(small)

# --- true bounding box of the mark inside the 256 box (after YSHIFT) --------
MX0, MY0, MW, MH = 37.5, 28.5, 181.0, 201.0


def placed_mark(uid, scale, tx, ty, **kw):
    """Place the mark so its bbox top-left lands exactly at (tx, ty)."""
    return (f'  <g transform="translate({tx - MX0*scale:.2f} {ty - MY0*scale:.2f}) '
            f'scale({scale})">\n{mark_group(uid, **kw)}\n  </g>')


# 3. horizontal lockup ------------------------------------------------------
MS = 0.62
mw, mh = MW * MS, MH * MS
top_size, bot_size = 46.0, 26.6
top, w_top, bot, w_bot, _ = wordmark(top_size, bot_size, 1.2, 3.6)
cap1, cap2 = top_size * CAP, bot_size * CAP
line_gap = 14.0
block_h = cap1 + line_gap + cap2
lock_h = 128.0
text_x = mw + 26.0
lock_w = text_x + max(w_top, w_bot) + 2
base1 = (lock_h - block_h) / 2 + cap1
base2 = base1 + line_gap + cap2
body = (placed_mark("h", MS, 0.0, (lock_h - mh) / 2) + "\n"
        f'  <g fill="currentColor" transform="translate({text_x:.2f} 0)">\n'
        f'    <g transform="translate(0 {base1:.2f})">\n      {top}\n    </g>\n'
        f'    <g transform="translate(0 {base2:.2f})">\n      {bot}\n    </g>\n'
        f'  </g>')
files["ao-logo-horizontal.svg"] = svg(body, w=int(lock_w), h=int(lock_h),
                                      vb=f"0 0 {lock_w:.0f} {lock_h:.0f}")

# 4. stacked lockup ---------------------------------------------------------
SS = 0.70
smw, smh = MW * SS, MH * SS
top2_size, bot2_size = 40.0, 23.2
top2, w_top2, bot2, w_bot2, _ = wordmark(top2_size, bot2_size, 1.0, 3.1)
cap1s, cap2s = top2_size * CAP, bot2_size * CAP
stack_w = max(smw, w_top2, w_bot2)
sbase1 = smh + 30.0 + cap1s          # 30px clear below the mark's lowest point
sbase2 = sbase1 + 16.0 + cap2s
stack_h = sbase2 + 4.0
body = (placed_mark("v", SS, (stack_w - smw) / 2, 0.0) + "\n"
        f'  <g fill="currentColor">\n'
        f'    <g transform="translate({(stack_w - w_top2)/2:.2f} {sbase1:.2f})">\n      {top2}\n    </g>\n'
        f'    <g transform="translate({(stack_w - w_bot2)/2:.2f} {sbase2:.2f})">\n      {bot2}\n    </g>\n'
        f'  </g>')
files["ao-logo-stacked.svg"] = svg(body, w=int(stack_w), h=int(stack_h),
                                   vb=f"0 0 {stack_w:.0f} {stack_h:.0f}")

# 5. avatar: solid disc, mark knocked out, sized to survive round cropping ---
AV, PAPER = 0.78, "#0F1319"
cut = A_W + 24
avatar = f'''  <circle cx="128" cy="128" r="128" fill="currentColor"/>
  <g transform="translate(128 128) scale({AV}) translate(-128 -{128 - YSHIFT})">
    <path d="{arc_path()}" fill="none" stroke="{PAPER}" stroke-width="{ARC_W}" stroke-linecap="round"/>
    <path d="{head_path()}" fill="{PAPER}"/>
    <path d="{a_legs()}" fill="none" stroke="currentColor" stroke-width="{cut}"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="{a_legs()}" fill="none" stroke="{PAPER}" stroke-width="{A_W}"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="{a_bar()}" fill="none" stroke="{PAPER}" stroke-width="{A_W}"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>'''
files["ao-avatar.svg"] = svg(avatar)

# 6. favicon: small-size drawing, explicit colour, dark-scheme aware ---------
style = ('<style>:root{color:#3B6EA5}'
         '@media (prefers-color-scheme:dark){:root{color:#7FA8D4}}</style>')
files["favicon.svg"] = svg(small, extra=style)

for name, content in files.items():
    with open(os.path.join(OUT, name), "w") as fh:
        fh.write(content)
    print("wrote", name, len(content), "bytes")
