const fs = require('fs');
const path = require('path');

async function readPeopleDataFromCsv(filePath) {
    try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) {
            console.warn('קובץ ה-CSV ריק.');
            return [];
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const dataRows = lines.slice(1);

        return dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const person = {};
            headers.forEach((header, index) => {
                let value = values[index];
                if (['Person_Id', 'Father_Id', 'Mother_Id', 'Spouse_Id'].includes(header)) {
                    person[header] = value === '' ? null : parseInt(value, 10);
                } else {
                    person[header] = value;
                }
            });
            return person;
        });
    } catch (error) {
        console.error(`שגיאה בקריאת קובץ CSV: ${filePath}`, error.message);
        throw error;
    }
}

function completeSpouseRelations(peopleData) {
    console.log('\nמתחילים בהשלמת קשרי בני/בנות זוג...');
    const peopleMap = new Map();
    peopleData.forEach(person => {
        if (person.Person_Id !== null) {
            peopleMap.set(person.Person_Id, person);
        }
    });

    let changesMade = 0;

    peopleData.forEach(person => {
        const currentPersonId = person.Person_Id;
        const spouseId = person.Spouse_Id;

        if (currentPersonId === null) {
            return;
        }

        if (spouseId !== null) {
            const spouse = peopleMap.get(spouseId);

            if (spouse) {
                if (spouse.Spouse_Id === null || spouse.Spouse_Id !== currentPersonId) {
                    spouse.Spouse_Id = currentPersonId;
                    changesMade++;
                    console.log(`  הושלם קשר זוגיות: אדם ID:${currentPersonId} -> ID:${spouseId}`);
                }
            } else {
                console.warn(`  אזהרה: אדם ID:${currentPersonId} מציין בן/בת זוג ID:${spouseId} שאינו קיים/ה בנתונים.`);
            }
        }
    });

    if (changesMade > 0) {
        console.log(`הושלמו ${changesMade} קשרי זוגיות.`);
    } else {
        console.log('לא נדרשו השלמות לקשרי זוגיות.');
    }
    return peopleData;
}

function createPeopleMap(data) {
    const peopleMap = new Map();
    data.forEach(person => {
        if (person.Person_Id !== null) {
            peopleMap.set(person.Person_Id, person);
        }
    });
    return peopleMap;
}

function buildFamilyTreeRelations(peopleData) {
    const relationsTable = [];
    const peopleMap = createPeopleMap(peopleData);

    for (const person of peopleData) {
        const currentPersonId = person.Person_Id;
        if (currentPersonId === null) {
            continue;
        }
        
        const currentPersonGender = person.Gender; // This variable is not used in the current implementation, but kept if future logic requires it.

        if (person.Father_Id !== null) {
            relationsTable.push({ Person_Id: currentPersonId, Relative_Id: person.Father_Id, Connection_Type: 'אב' });
        }
        if (person.Mother_Id !== null) {
            relationsTable.push({ Person_Id: currentPersonId, Relative_Id: person.Mother_Id, Connection_Type: 'אם' });
        }

        for (const potentialChild of peopleData) {
            if (potentialChild.Person_Id === null || potentialChild.Person_Id === currentPersonId) {
                continue;
            }

            if (potentialChild.Father_Id === currentPersonId) {
                relationsTable.push({ Person_Id: currentPersonId, Relative_Id: potentialChild.Person_Id, Connection_Type: 'בן' });
            } else if (potentialChild.Mother_Id === currentPersonId) {
                relationsTable.push({ Person_Id: currentPersonId, Relative_Id: potentialChild.Person_Id, Connection_Type: 'בת' });
            }
        }

        if (person.Spouse_Id !== null) {
            const spouse = peopleMap.get(person.Spouse_Id);
            if (spouse && spouse.Person_Id !== currentPersonId) {
                const connectionType = (spouse.Gender === 'זכר') ? 'בן זוג' : 'בת זוג';
                relationsTable.push({ Person_Id: currentPersonId, Relative_Id: person.Spouse_Id, Connection_Type: connectionType });
            }
        }

        const currentFatherId = person.Father_Id;
        const currentMotherId = person.Mother_Id;

        if (currentFatherId !== null || currentMotherId !== null) {
            for (const potentialSibling of peopleData) {
                if (potentialSibling.Person_Id === null || potentialSibling.Person_Id === currentPersonId) {
                    continue;
                }

                const sameFather = (potentialSibling.Father_Id === currentFatherId) && currentFatherId !== null;
                const sameMother = (potentialSibling.Mother_Id === currentMotherId) && currentMotherId !== null;

                if (sameFather && sameMother) {
                    const connectionType = (potentialSibling.Gender === 'זכר') ? 'אח' : 'אחות';
                    relationsTable.push({ Person_Id: currentPersonId, Relative_Id: potentialSibling.Person_Id, Connection_Type: connectionType });
                }
            }
        }
    }
    
    const uniqueRelations = [];
    const seenRelations = new Set();
    for (const relation of relationsTable) {
        const key = `${relation.Person_Id}-${relation.Relative_Id}-${relation.Connection_Type}`;
        if (!seenRelations.has(key)) {
            seenRelations.add(key);
            uniqueRelations.push(relation);
        }
    }

    return uniqueRelations;
}

async function saveRelationsToCsv(relations, fileName = 'family_relations.csv') {
    const csvHeader = 'Person_Id,Relative_Id,Connection_Type\n';
    const csvRows = relations.map(rel => `${rel.Person_Id},${rel.Relative_Id},${rel.Connection_Type}`).join('\n');
    try {
        await fs.promises.writeFile(fileName, csvHeader + csvRows, 'utf8');
        console.log(`\nהפלט נשמר לקובץ: ${fileName}`);
    } catch (error) {
        console.error(`שגיאה בשמירת קובץ הפלט:`, error.message);
    }
}

async function saveUpdatedPeopleDataToCsv(peopleData, fileName = 'people_data_updated.csv') {
    const csvHeader = 'Person_Id,Personal_Name,Family_Name,Gender,Father_Id,Mother_Id,Spouse_Id\n';
    const csvRows = peopleData.map(person => {
        const fatherId = person.Father_Id === null ? '' : person.Father_Id;
        const motherId = person.Mother_Id === null ? '' : person.Mother_Id;
        const spouseId = person.Spouse_Id === null ? '' : person.Spouse_Id;
        return `${person.Person_Id},${person.Personal_Name},${person.Family_Name},${person.Gender},${fatherId},${motherId},${spouseId}`;
    }).join('\n');

    try {
        await fs.promises.writeFile(fileName, csvHeader + csvRows, 'utf8');
        console.log(`נתוני האנשים המעודכנים נשמרו לקובץ: ${fileName}`);
    } catch (error) {
        console.error(`שגיאה בשמירת קובץ נתוני האנשים המעודכנים:`, error.message);
    }
}

async function main() {
    const peopleDataFilePath = path.join(__dirname, 'people_data.csv');

    try {
        console.log(`קורא נתוני אנשים מקובץ: ${peopleDataFilePath}`);
        let peopleData = await readPeopleDataFromCsv(peopleDataFilePath);
        
        if (peopleData.length === 0) {
            console.log("לא נמצאו נתונים תקינים לעיבוד. מסיים פעולה.");
            return;
        }

        console.log(`נמצאו ${peopleData.length} רשומות אנשים בקובץ.`);
        
        peopleData = completeSpouseRelations(peopleData);

        await saveUpdatedPeopleDataToCsv(peopleData);

        const familyRelations = buildFamilyTreeRelations(peopleData);

        console.log('\n--- טבלת קשרי משפחה מדרגה ראשונה ---');
        console.log('Person_Id | Relative_Id | Connection_Type');
        console.log('----------|-------------|-----------------');
        familyRelations.forEach(rel => {
            console.log(`${String(rel.Person_Id).padEnd(9)} | ${String(rel.Relative_Id).padEnd(11)} | ${rel.Connection_Type}`);
        });
        console.log(`\nסה"כ ${familyRelations.length} קשרים ייחודיים נמצאו.`);

        await saveRelationsToCsv(familyRelations);

    } catch (error) {
        console.error('שגיאה במהלך עיבוד עץ המשפחה:', error);
    }
}

main();