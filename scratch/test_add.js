const apiKey = '554C767EA3D2-4221-AB6A-C126C68A657E';
const serverUrl = 'https://api.ibmanha.com.br';
const instanceName = 'IBM';
const participant = '5521989001302@s.whatsapp.net'; // With @s.whatsapp.net

async function run() {
    // 1. Fetch groups to find a valid group JID
    const listRes = await fetch(`${serverUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`, {
        headers: { 'apikey': apiKey }
    });
    const groups = await listRes.json();
    const groupList = (groups.groups || groups.data || groups);
    
    // Find a group that is NOT a community
    const targetGroup = groupList.find(g => !g.isCommunity) || groupList[0];
    if (!targetGroup) {
        console.log('No groups found');
        return;
    }
    const gJid = targetGroup.id || targetGroup.jid;
    console.log('Using group:', targetGroup.subject, 'JID:', gJid);

    // 2. Try to add participant
    const addUrl = `${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${gJid}`;
    const body = {
        action: 'add',
        participants: [participant]
    };

    const res = await fetch(addUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'apikey': apiKey 
        },
        body: JSON.stringify(body)
    });
    console.log('Status:', res.status);
    const resData = await res.json().catch(err => ({ err }));
    console.log('Response data:', JSON.stringify(resData, null, 2));
}

run();
