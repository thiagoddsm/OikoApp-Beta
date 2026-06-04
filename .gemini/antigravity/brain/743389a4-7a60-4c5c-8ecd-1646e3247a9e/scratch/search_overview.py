import re

overview_path = r"C:\Users\Thiago Moura\.gemini\antigravity\brain\743389a4-7a60-4c5c-8ecd-1646e3247a9e\.system_generated\logs\overview.txt"
out_path = r"C:\Users\Thiago Moura\Downloads\oiko(studio)\.gemini\antigravity\brain\743389a4-7a60-4c5c-8ecd-1646e3247a9e\scratch\overview_matches.txt"

matches = []
with open(overview_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Find paragraphs or lines containing finance or notific
lines = content.split('\n')
for i, line in enumerate(lines):
    if any(k in line.lower() for k in ["finance", "notific", "solicita", "whatsapp"]):
        matches.append(f"Line {i}: {line}")

with open(out_path, 'w', encoding='utf-8') as out:
    out.write('\n'.join(matches))

print(f"Done. Found {len(matches)} matches.")
