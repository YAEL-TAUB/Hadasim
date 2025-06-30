const fs = require('fs');
const csv = require('csv-parser');

const filePath = 'time_series.csv';

const data = [];

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    data.push(row);
  })
  .on('end', () => {
    console.log('קריאת הקובץ הסתיימה.');
    console.log('נתונים גולמיים:', data);

    processAndValidateData(data);
  });

function processAndValidateData(rawData) {
    console.log('מתחילים בבדיקה ועיבוד הנתונים...');
    const validatedData = [];
    const timestampsSeen = new Set(); 
    const now = new Date();

    for (const row of rawData) {
        const timestampStr = row.timestamp; 
        const valueStr = row.value;

        if (!timestampStr) {
            continue;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
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

    calculateHourlyAverages(validatedData);
}

function calculateHourlyAverages(data) {
    console.log('מתחילים בחישוב ממוצעים לפי שעה...');

    const hourlyData = {};

    for (const item of data) {
        const timestamp = item.timestamp;
        const value = item.value;

        const hourKey = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours()
        );

        const hourKeyISO = hourKey.toISOString();

        if (!hourlyData[hourKeyISO]) {
            hourlyData[hourKeyISO] = { sum: 0, count: 0 };
        }

        hourlyData[hourKeyISO].sum += value;
        hourlyData[hourKeyISO].count += 1;
    }

    const hourlyAverages = [];
    for (const key in hourlyData) {
        const average = hourlyData[key].sum / hourlyData[key].count;
        hourlyAverages.push({
            timestamp: new Date(key),
            average: parseFloat(average.toFixed(2))
        });
    }

    hourlyAverages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    console.log('\nממוצעים שעתיים:');
    for (const entry of hourlyAverages) {
        const displayDate = entry.timestamp.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const displayTime = entry.timestamp.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).substring(0, 5) + ':00';
        
        console.log(`תאריך/שעה: ${displayDate} ${displayTime}, ממוצע: ${entry.average}`);
    }

    console.log(`\nסה"כ ${hourlyAverages.length} ממוצעים שעתיים חושבו.`);
}