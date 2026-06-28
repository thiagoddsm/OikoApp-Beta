const assert = require('assert');

function simulate(raw) {
    let data = raw.data || raw;
    if (Array.isArray(data)) data = data[0];
    
    const isEvolutionV2 = raw.event === 'messages.upsert' && !!data.message;
    const msgObject = isEvolutionV2 ? data.message : data;
    const msgContent = isEvolutionV2 ? (msgObject.message || {}) : (msgObject.msgContent || msgObject.message || {});
    
    let fromRaw = String(
        msgObject.from || 
        msgObject.key?.remoteJid || 
        msgObject.participant || 
        msgObject.author || 
        msgObject.pollCreationMessageKey?.remoteJid || 
        data.key?.remoteJid || 
        data.participant ||
        ''
    );

    if (!fromRaw) {
        return "NO FROM RAW";
    }

    const fromParts = fromRaw.split('@')[0].split(':');
    let fromPhone = fromParts[0].replace(/\D/g, '');
    const isLid = fromRaw.includes('@lid') || (fromPhone.length > 0 && !fromPhone.startsWith('55') && fromPhone.length < 13 && fromPhone.length > 8);
    
    let responseType = 'text';
    let payload = null;
    let stanzaId = msgObject.key?.id || msgObject.id || msgObject.messageId || data.key?.id || '';

    if (msgContent.pollUpdateMessage || msgObject.pollUpdates || msgObject.pollUpdateMessage || msgObject.pollUpdate || msgObject.update?.pollUpdates || data.pollUpdates) {
        const pollData = msgContent.pollUpdateMessage || msgObject.pollUpdates || msgObject.pollUpdateMessage || msgObject.pollUpdate || msgObject.update?.pollUpdates || data.pollUpdates || {};
        const pollUpdate = Array.isArray(pollData) ? pollData[0] : pollData;
        
        let options = pollUpdate.vote?.selectedOptions || pollUpdate.selectedOptions || msgObject.selectedOptions || [];
        if (options.length === 0 && Array.isArray(data.pollUpdates)) {
            data.pollUpdates.forEach((pu) => {
                if (pu.voters && pu.voters.length > 0) {
                    options.push(pu.name);
                }
            });
        }
        if (!Array.isArray(options)) options = [options].filter(Boolean);
        
        const pollName = msgObject.pollName || pollUpdate.name || pollUpdate.pollName || msgContent.pollCreationMessage?.name || 'Enquete';
        options = options.map(o => typeof o === 'string' ? o : o.label || o.text || o.name).filter(Boolean);
        if (options.length === 0) options = ['Voto registrado'];

        responseType = 'poll';
        payload = {
            pollName: pollName,
            pollId: stanzaId || pollName, 
            selectedOptions: options,
            pollDataString: typeof pollUpdate === 'string' ? pollUpdate : JSON.stringify(pollUpdate)
        };

        if (!raw.event && (!options || options.length === 0 || typeof pollData.vote?.encPayload !== 'undefined')) {
            return "WAME_IGNORED";
        }
    }

    return { responseType, fromRaw, isLid, stanzaId, payload };
}

const raw = {
  "event":"messages.upsert",
  "instance":"IBM",
  "data":{
    "key":{
      "remoteJid":"5521989001302@s.whatsapp.net",
      "remoteJidAlt":"5521989001302@s.whatsapp.net",
      "fromMe":false,
      "id":"3EB091C3ACF62813890A1B",
      "participant":"",
      "addressingMode":"lid"
    },
    "pushName":"Thiago Moura",
    "status":"DELIVERY_ACK",
    "message":{
      "messageContextInfo":{},
      "pollUpdateMessage":{
        "pollCreationMessageKey":{
          "remoteJid":"43817323462720@lid",
          "fromMe":true,
          "id":"3EB0B65A4CA987DC67104F",
          "participant":""
        },
        "vote":{
          "encPayload":{},
          "encIv":{},
          "selectedOptions":["Opção 3"]
        },
        "senderTimestampMs":{"low":-226408708,"high":414,"unsigned":false}
      }
    },
    "messageType":"pollUpdateMessage",
    "messageTimestamp":1782185020,
    "instanceId":"a98cfdae-fec3-40dd-871f-ce7fce9a7471",
    "source":"web",
    "pollUpdates":[
      {"name":"Opção 1","voters":[]},
      {"name":"Opção 2","voters":[]},
      {"name":"Opção 3","voters":["43817323462720@lid"]}
    ]
  }
};

console.log(JSON.stringify(simulate(raw), null, 2));
