const SHEET_ID = "1YeUQWYYg7HKlYdWC1Q7Hmsyp1IQzXYaW7ibCN_zcvSc";

async function fetchSheetData(SHEET_NAME) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_NAME}`;

    const res = await fetch(url);
    const text = await res.text();

    // Google wraps JSON in a weird function, so we clean it:
    const json = JSON.parse(text.substring(47).slice(0, -2));

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
