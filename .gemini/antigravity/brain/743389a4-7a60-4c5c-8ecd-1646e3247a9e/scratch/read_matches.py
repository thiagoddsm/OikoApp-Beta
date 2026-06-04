import json

log_path = r"C:\Users\Thiago Moura\.gemini\antigravity\brain\743389a4-7a60-4c5c-8ecd-1646e3247a9e\.system_generated\logs\transcript.jsonl"
out_path = r"C:\Users\Thiago Moura\Downloads\oiko(studio)\.gemini\antigravity\brain\743389a4-7a60-4c5c-8ecd-1646e3247a9e\scratch\finance_matches.txt"

with open(log_path, 'r', encoding='utf-8') as f, open(out_path, 'w', encoding='utf-8') as out:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get("type") in ("USER_INPUT", "PLANNER_RESPONSE"):
                content = data.get("content", "")
                content_lower = content.lower()
                if "finance" in content_lower or "notific" in content_lower or "solicita" in content_lower:
                    out.write(f"=== Step {data.get('step_index')} ({data.get('type')}) ===\n")
                    out.write(content)
                    out.write("\n" + "="*50 + "\n\n")
        except Exception as e:
            pass

print("Done writing matches to scratch/finance_matches.txt")
