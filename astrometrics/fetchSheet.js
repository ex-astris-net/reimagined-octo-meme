const SHEET_ID = "1YeUQWYYg7HKlYdWC1Q7Hmsyp1IQzXYaW7ibCN_zcvSc";

async function fetchSheetData(SHEET_NAME) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_NAME}`;
    console.log("Fetching", url);

    let json;

    try {
        const res = await fetch(url);
        const text = await res.text();

        // Google wraps JSON in a weird function, so we clean it:
        json = JSON.parse(text.substring(47).slice(0, -2));
        console.log(JSON.stringify(json));
    }
    catch (err) {
        console.log("Couldn't fetch, falling back to hardcopy JSON...");
        json = BACKUP_JSON;
    }

    const rows = json.table.rows;

    // Convert to clean JS objects
    const data = rows.map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
        const colName = json.table.cols[i].label;
        obj[colName] = cell ? cell.v : null;
        });
        return obj;
    });

    return data;

}



const BACKUP_JSON = {"version":"0.6","reqId":"0","status":"ok","sig":"1833491855","table":{"cols":[{"id":"A","label":"Class","type":"string"},{"id":"B","label":"Type","type":"string"},{"id":"C","label":"Name","type":"string"},{"id":"D","label":"Orbit","type":"number","pattern":"General"},{"id":"E","label":"Mass","type":"number","pattern":"General"},{"id":"F","label":"Notes","type":"string"},{"id":"G","label":"Short Range","type":"string"},{"id":"H","label":"","type":"string"},{"id":"I","label":"https://ex-astris-net.github.io/reimagined-octo-meme/astrometrics/?system=poi-b-3047","type":"string"}],"rows":[{"c":[{"v":"S"},{"v":"stellar"},{"v":"3047-Alpha"},{"v":0.1,"f":"0.1"},{"v":1.7,"f":"1.7"},{"v":"Type A (White) Main Sequence"},null,null,{"v":null}]},{"c":[{"v":"D"},{"v":"body"},{"v":"3047-I"},{"v":0.56,"f":"0.56"},{"v":0.08,"f":"0.08"},null,null,null,{"v":null}]},{"c":[{"v":"K"},{"v":"body"},{"v":"3047-II"},{"v":0.79,"f":"0.79"},{"v":29.25,"f":"29.25"},null,null,null,{"v":null}]},{"c":[{"v":"D"},{"v":"body"},{"v":"3047-III"},{"v":1.24,"f":"1.24"},{"v":0.09,"f":"0.09"},null,null,null,{"v":null}]},{"c":[{"v":"M"},{"v":"body"},{"v":"3047-IV"},{"v":2.19,"f":"2.19"},{"v":1.05,"f":"1.05"},null,{"v":"Life sign readings consistent with Bolian physiology detected across multiple small settlements.<br>No record of Bolian colony here or nearby exists in Federation databanks."},null,{"v":null}]},{"c":[{"v":"P"},{"v":"body"},{"v":"3047-V"},{"v":3.39,"f":"3.39"},{"v":2.03,"f":"2.03"},null,null,null,{"v":null}]},{"c":[{"v":"J"},{"v":"body"},{"v":"3047-VI"},{"v":5.06,"f":"5.06"},{"v":317.55,"f":"317.55"},null,null,null,{"v":null}]}],"parsedNumHeaders":1}};