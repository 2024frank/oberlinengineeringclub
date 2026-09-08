"""Build a small Three.js typeface from the licensed, local Barlow font."""

import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'public/brand/workbench/barlow-condensed-semibold.ttf')
glyph_set = font.getGlyphSet()
scale = 1000 / font['head'].unitsPerEm


class OutlinePen(BasePen):
    def __init__(self):
        super().__init__(glyph_set)
        self.commands = []

    def point(self, point):
        return ' '.join(str(round(v * scale, 3)) for v in point)

    def _moveTo(self, point):
        self.commands.append('m ' + self.point(point))

    def _lineTo(self, point):
        self.commands.append('l ' + self.point(point))

    def _qCurveToOne(self, control, end):
        self.commands.append('q ' + self.point(end) + ' ' + self.point(control))

    def _curveToOne(self, first, second, end):
        self.commands.append('b ' + self.point(end) + ' ' + self.point(first) + ' ' + self.point(second))

    def _closePath(self):
        pass


glyphs = {}
for character in sorted(set('OBERLIN ENGINEERING CLUB PREVIEW OEC?')):
    name = font.getBestCmap().get(ord(character))
    if name is None:
        continue
    pen = OutlinePen()
    glyph_set[name].draw(pen)
    glyphs[character] = {'ha': font['hmtx'][name][0] * scale, 'o': ' '.join(pen.commands)}

data = {'glyphs': glyphs, 'familyName': 'Barlow Condensed', 'resolution': 1000,
        'boundingBox': {'yMin': font['head'].yMin * scale, 'yMax': font['head'].yMax * scale},
        'underlineThickness': 50}
output = root / 'public/brand/workbench/barlow-heading.typeface.json'
output.write_text(json.dumps(data, separators=(',', ':')) + '\n')
print(f'Built {len(glyphs)} glyphs: {output.name} ({output.stat().st_size} bytes)')
