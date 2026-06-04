import json

log_path = r"C:\Users\Thiago Moura\.gemini\antigravity\brain\743389a4-7a60-4c5c-8ecd-1646e3247a9e\.system_generated\logs\transcript.jsonl"

print("Searching transcript for financial/notification references...")
with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            # We want to find user input lines or planner response lines containing relevant words
            if data.get("type") == "USER_INPUT" or data.get("type") == "PLANNER_RESPONSE":
                content = data.get("content", "")
                content_lower = content.lower()
                if "finance" in content_lower or "notific" in content_lower or "solicita" in content_lower:
                    print(f"--- Step {data.get('step_index')} ({data.get('type')}) ---")
                    print(content)
                    print("-" * 50)
        except Exception as e:
            pass
