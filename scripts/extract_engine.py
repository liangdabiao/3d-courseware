"""Extract the shared engine prefix (three.js + shell) from a donor course file,
so a new course can be built as a standalone offline HTML.

The donor file layout (all courses in tongjiang-lab use the same layout):
  <!doctype html> ... <body> <canvas id=gl> <script type="module">
    [three.js bundle][OrbitControls][framework (shell CSS template, UI, step engine)]
    [course-specific code: C, world, model, console, entry call]
  </script></body></html>

We split at the beginning of the shell CSS template literal, which every course
carries verbatim: the backtick-quoted string starting with
`/* shared/step · 步骤条形态外壳 · 清透实验室 v0.2 ...`

Usage:
  python extract_engine.py <donor.html> <out-prefix.js>
  # out-prefix.js contains: `var W0=...;` ... up to (not including) the CSS template.
"""
import sys, re, io

MARKER = "/* shared/step"


def main(donor: str, out: str) -> None:
    data = io.open(donor, encoding="utf-8").read()
    start = data.find('<script type="module">')
    if start < 0:
        sys.exit("no module script found")
    start += len('<script type="module">')

    # the CSS template literal opens with a backtick right before the marker
    m = data.find(MARKER, start)
    if m < 0:
        sys.exit("shell CSS marker not found")
    btick = data.rfind("`", start, m)
    if btick < 0:
        sys.exit("opening backtick not found")

    prefix = data[start:btick]
    io.open(out, "w", encoding="utf-8", newline="\n").write(prefix)
    print(f"engine prefix: {len(prefix)} bytes -> {out}")
    print("starts:", prefix[:60].replace("\n", " "))
    print("ends  :", prefix[-80:].replace("\n", " "))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
