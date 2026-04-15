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



const BACKUP_JSON = {"version":"0.6","reqId":"0","status":"ok","sig":"615964242","table":{"cols":[{"id":"A","label":"Class","type":"string"},{"id":"B","label":"Type","type":"string"},{"id":"C","label":"Name","type":"string"},{"id":"D","label":"Orbit","type":"number","pattern":"General"},{"id":"E","label":"Mass","type":"number","pattern":"General"},{"id":"F","label":"Notes","type":"string"},{"id":"G","label":"Revolution","type":"string"},{"id":"H","label":"Rotation","type":"string"},{"id":"I","label":"Gravity","type":"number","pattern":"General"},{"id":"J","label":"Avg Surface Temp","type":"string"},{"id":"K","label":"Atmosphere","type":"string"},{"id":"L","label":"","type":"string"},{"id":"M","label":"","type":"string"},{"id":"N","label":"","type":"string"},{"id":"O","label":"","type":"string"},{"id":"P","label":"","type":"string"},{"id":"Q","label":"","type":"string"},{"id":"R","label":"","type":"string"},{"id":"S","label":"","type":"string"},{"id":"T","label":"","type":"string"},{"id":"U","label":"","type":"string"},{"id":"V","label":"","type":"string"},{"id":"W","label":"","type":"string"},{"id":"X","label":"","type":"string"},{"id":"Y","label":"","type":"string"}],"rows":[{"c":[{"v":"S"},{"v":"stellar"},{"v":"V774 Tau"},{"v":0.01,"f":"0.01"},{"v":0.87,"f":"0.87"},{"v":"G0IV Type G (Yellow) Main Sequence<br><br>\nConstellation: Taurus<br>\nRight Ascension: 04h 15m 28.86s<br>\nDeclination: +06° 11' 13.6\"<br>\nDistance from Sol: 69 lightyears"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"J"},{"v":"body"},{"v":"V774 Tau I"},{"v":0.1,"f":"0.1"},{"v":51.27,"f":"51.27"},null,{"v":"83.2 days"},{"v":"9.6 hours"},{"v":2.64,"f":"2.64"},{"v":"405° C"},{"v":"High Pressure (Hydrogen, Helium, Methane, ...)"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"D"},{"v":"field"},{"v":"Asteroid Belt"},{"v":0.27,"f":"0.27"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"D"},{"v":"body"},{"v":"V774 Tau II"},{"v":0.4,"f":"0.4"},{"v":0.09,"f":"0.09"},{"v":"Located in the asteroid belt."},{"v":"91.9 days"},{"v":"5.75 days"},{"v":0.09,"f":"0.09"},{"v":"374° C"},{"v":"None"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"H"},{"v":"body"},{"v":"V774 Tau III"},{"v":0.8,"f":"0.8"},{"v":28.83,"f":"28.83"},{"v":"Two small moons, Class D"},{"v":"294.1 days"},{"v":"34.4 days"},{"v":0.92,"f":"0.92"},{"v":"126° C"},{"v":"High Pressure (Carbon Dioxide, Nitrogen, Argon)"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"K"},{"v":"body"},{"v":"V774 Tau IV"},{"v":1.4,"f":"1.4"},{"v":10.94,"f":"10.94"},{"v":"Large moon, Class D"},{"v":"1.66 days"},{"v":"27.1 days"},{"v":0.41,"f":"0.41"},{"v":"-40° C"},{"v":"Low Pressure (Carbon Dioxide, Nitrogen, Oxygen)"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"J"},{"v":"body"},{"v":"V774 Tau V"},{"v":3.2,"f":"3.2"},{"v":188.94,"f":"188.94"},{"v":"Strong magnetic field"},{"v":"5.56 days"},{"v":"16.1 hours"},{"v":1.78,"f":"1.78"},{"v":"-198° C"},{"v":"High Pressure (Hydrogen, Helium, Methane, ...)"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"A"},{"v":"artificial"},{"v":"Deep Space 13"},{"v":5.6,"f":"5.6"},{"v":6.88e-14,"f":"0"},{"v":"Deep Space Station, United Federation of Planets<br>\nOperated by Starfleet, 38th Fleet"},{"v":"9.73 years"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"D"},{"v":"body"},{"v":"V774 Tau VI"},{"v":8.1,"f":"8.1"},{"v":0.06,"f":"0.06"},{"v":"Highly eccentric orbit"},{"v":"30.2 years"},{"v":"3.10 days"},{"v":0.32,"f":"0.32"},{"v":"-191° C"},{"v":"None"},null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]}],"parsedNumHeaders":1}};