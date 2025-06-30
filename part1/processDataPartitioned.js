const fs = require('fs');
const path = require('path');

function processAndValidateData(rawDataLines) {
    console.log('מתחילים בבדיקה ועיבוד הנתונים...');
    const validatedData = [];
    const timestampsSeen = new Set();
    const now = new Date();

    for (const line of rawDataLines) {
        const [timestampStr, valueStr] = line.split(',');

        if (!timestampStr || !valueStr) {
            continue;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value) || !isFinite(value) || value < 0) {
            continue;
        }

        const parts = timestampStr.split(' ');
        if (parts.length !== 2) {
            continue;
        }
        const datePart = parts[0];
        const timePart = parts[1];

        const [day, month, year] = datePart.split('/');

        const [hours, minutes] = timePart.split(':');
        if (hours === undefined || minutes === undefined) {
            continue;
        }

        const formattedHours = hours.length === 1 ? '0' + hours : hours;
        const formattedMinutes = minutes.length === 1 ? '0' + minutes : minutes;

        const isoTimestamp = `${year}-${month}-${day}T${formattedHours}:${formattedMinutes}:00`;

        const dateObject = new Date(isoTimestamp);

        if (isNaN(dateObject.getTime())) { 
            continue;
        }

        if (dateObject.getTime() > now.getTime()) {
            console.warn(`אזהרה: שורה נפסלה עקב Timestamp עתידי: ${timestampStr} בשורה:`, line);
            continue;
        }

        if (timestampsSeen.has(isoTimestamp)) {
            continue;
        }
        timestampsSeen.add(isoTimestamp);

        validatedData.push({
            value: value,
            timestamp: dateObject
        });
    }

    console.log(`נמצאו ${validatedData.length} רשומות תקינות לאחר בדיקה ואימות.`);
    return validatedData;
}

function calculateHourlyAverages(records) {
    const hourlyData = new Map();

    records.forEach(record => {
        const hourKey = `${record.timestamp.getFullYear()}-${(record.timestamp.getMonth() + 1).toString().padStart(2, '0')}-${record.timestamp.getDate().toString().padStart(2, '0')} ${record.timestamp.getHours().toString().padStart(2, '0')}:00:00`;

        if (!hourlyData.has(hourKey)) {
            hourlyData.set(hourKey, { sum: 0, count: 0 });
        }
        const data = hourlyData.get(hourKey);
        data.sum += record.value;
        data.count++;
    });

    const averages = [];
    for (const [key, data] of hourlyData.entries()) {
        const avg = data.sum / data.count;
        averages.push({
            timestamp: key,
            average: parseFloat(avg.toFixed(2))
        });
    }

    averages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return averages;
}

async function processDataInParts(filePath) {
    console.log(`מתחילים בטיפול בקובץ: ${filePath}`);
    let fileContent;
    try {
        fileContent = await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error(`שגיאה בקריאת הקובץ ${filePath}:`, error.message);
        return;
    }

    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    const validRecords = processAndValidateData(lines);

    console.log(`סה"כ רשומות תקינות שיתעבדו: ${validRecords.length}`);

    const dailyPartitions = new Map();

    validRecords.forEach(record => {
        const dateKey = `${record.timestamp.getFullYear()}-${(record.timestamp.getMonth() + 1).toString().padStart(2, '0')}-${record.timestamp.getDate().toString().padStart(2, '0')}`;
        if (!dailyPartitions.has(dateKey)) {
            dailyPartitions.set(dateKey, []);
        }
        dailyPartitions.get(dateKey).push(record);
    });

    console.log(`הנתונים חולקו ל-${dailyPartitions.size} ימים.`);

    const allHourlyAverages = [];
    for (const [dateKey, recordsForDay] of dailyPartitions.entries()) {
        const dailyAverages = calculateHourlyAverages(recordsForDay);
        allHourlyAverages.push(...dailyAverages);
    }

    allHourlyAverages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log('\nממוצעים שעתיים מאוחדים:');
    allHourlyAverages.forEach(avg => {
        const formattedDate = new Date(avg.timestamp).toLocaleString('he-IL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(/\./g, '/').replace(/,/, '');
        console.log(`תאריך/שעה: ${formattedDate}, ממוצע: ${avg.average}`);
    });

    console.log(`\nסה"כ ${allHourlyAverages.length} ממוצעים שעתיים חושבו ואוחדו.`);

    const outputFileName = 'hourly_averages_partitioned.csv';
    const csvHeader = 'Timestamp,Average\n';
    const csvRows = allHourlyAverages.map(avg => `${avg.timestamp},${avg.average}`).join('\n');
    try {
        await fs.promises.writeFile(outputFileName, csvHeader + csvRows, 'utf8');
        console.log(`הפלט נשמר לקובץ: ${outputFileName}`);
    } catch (error) {
        console.error(`שגיאה בשמירת קובץ הפלט:`, error.message);
    }
}

processDataInParts(path.join(__dirname, 'time_series.csv'));