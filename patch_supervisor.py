import re

with open(r'c:\Users\user\.gemini\antigravity\scratch\OikoApp-Beta\src\app\dashboard\gc\supervisor\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the state
content = re.sub(
    r"const \[diagFilter, setDiagFilter\] = useState\<'all' \| 'ready' \| 'attention' \| 'alerts'\>\('all'\);",
    r"const [diagFilter, setDiagFilter] = useState<'all' | 'red' | 'yellow' | 'green' | 'ready' | 'attention' | 'alerts'>('all');",
    content
)

# 2. Update the buttons
buttons_target = r"""                      <Button
                        size="sm"
                        variant={diagFilter === 'ready' \? 'default' : 'outline'}
                        className=\{cn\("text-xs font-bold h-8 gap-1", diagFilter === 'ready' && "bg-emerald-600 hover:bg-emerald-700 text-white"\)\}
                        onClick=\{.*?setDiagFilter\('ready'\)\}
                      >
                        <Rocket className="h-3\.5 w-3\.5" /> Prontas
                      </Button>"""

new_buttons = """                      <Button
                        size="sm"
                        variant={diagFilter === 'red' ? 'default' : 'outline'}
                        className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'red' && "bg-red-600 hover:bg-red-700 text-white")}
                        onClick={() => setDiagFilter('red')}
                      >
                        <span>🔴</span> Vermelhas
                      </Button>
                      <Button
                        size="sm"
                        variant={diagFilter === 'yellow' ? 'default' : 'outline'}
                        className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'yellow' && "bg-amber-500 hover:bg-amber-600 text-white")}
                        onClick={() => setDiagFilter('yellow')}
                      >
                        <span>🟡</span> Amarelas
                      </Button>
                      <Button
                        size="sm"
                        variant={diagFilter === 'green' ? 'default' : 'outline'}
                        className={cn("text-xs font-bold h-8 gap-1", diagFilter === 'green' && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => setDiagFilter('green')}
                      >
                        <span>🟢</span> Verdes
                      </Button>"""

content = re.sub(buttons_target, new_buttons, content)

# 3. Update the filter logic
filter_logic_target = r"""                        \.filter\(\(\{ evalData \}\) => \{
                          if \(diagFilter === 'ready'\) return evalData\.isReadyForMultiplication;
                          if \(diagFilter === 'attention'\) return evalData\.attentionReasons\.length > 0;
                          if \(diagFilter === 'alerts'\) return evalData\.operationalAlerts\.length > 0;
                          return true;
                        \}\)"""

new_filter_logic = """                        .filter(({ evalData }) => {
                          if (diagFilter === 'red') return evalData.trafficLightStatus === 'RED';
                          if (diagFilter === 'yellow') return evalData.trafficLightStatus === 'YELLOW';
                          if (diagFilter === 'green') return evalData.trafficLightStatus === 'GREEN';
                          if (diagFilter === 'attention') return evalData.attentionReasons.length > 0;
                          if (diagFilter === 'alerts') return evalData.operationalAlerts.length > 0;
                          return true;
                        })"""

content = re.sub(filter_logic_target, new_filter_logic, content)

with open(r'c:\Users\user\.gemini\antigravity\scratch\OikoApp-Beta\src\app\dashboard\gc\supervisor\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated")
