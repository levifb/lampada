# Rasteriza o ícone com o Chrome headless (PNG para o manifest)
import subprocess, sys, os
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
svg = open(os.path.join(here, "icon.svg"), encoding="utf8").read()
for size, name, pad in [(512, "icon-512.png", 0), (192, "icon-192.png", 0), (180, "icon-180.png", 0), (512, "maskable-512.png", 1)]:
    inner = svg if not pad else svg.replace('r="196"', 'r="150"').replace('r="178"', 'r="136"').replace('<path', '<g transform="translate(256 256) scale(.76) translate(-256 -256)"><path', 1).replace('</svg>', '</g></svg>')
    html = os.path.join(here, "_tmp.html")
    open(html, "w", encoding="utf8").write(f"<html><body style='margin:0'><div style='width:{size}px;height:{size}px'>{inner.replace('<svg ', f'<svg width=\"{size}\" height=\"{size}\" ', 1)}</div></body></html>")
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={size},{size}", f"--screenshot={os.path.join(here, name)}", "file:///" + html.replace("\\", "/")], check=True, capture_output=True)
    os.remove(html)
    print(name)
