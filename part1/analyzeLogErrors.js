const fs = require('fs');
const readline = require('readline');
const path = require('path');

// --- Configuration Constants ---
// Ensure this path is absolutely correct!
const LOG_FILE_PATH = "logs.txt"; // Change this to your actual log file path
// Ensure the log file exists before running the script 
const CHUNK_SIZE_IN_LINES = 1000; // Process file in chunks of this many lines

// Determine N from command line arguments, default to 10 if not provided
const N_MOST_FREQUENT = process.argv[2] ? parseInt(process.argv[2]) : 10;

// Validate N: Must be a positive number
if (isNaN(N_MOST_FREQUENT) || N_MOST_FREQUENT <= 0) {
    console.error("[ERROR] N must be a positive number. Example: node your_script_name.js 5");
    process.exit(1); // Exit with an error code
}

// --- Main Processing Function ---
async function processLargeLogFile(filePath, chunkSize) {
    const fileStream = fs.createReadStream(filePath);
    
    let isFileOpened = false;
    fileStream.on('open', () => {
        console.log(`[INFO] File "${filePath}" opened successfully.`);
        isFileOpened = true;
    });

    fileStream.on('error', (err) => {
        console.error(`[ERROR] Error opening or reading file "${filePath}":`, err.message);
        throw err; 
    });

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentChunkLines = [];
    let chunkCount = 0;
    const allErrorCounts = new Map(); // Stores global error counts
    let linesReadCount = 0;
    let errorsFoundInFile = 0; // Total errors found matching the format

    try {
        // Read file line by line
        for await (const line of rl) {
            linesReadCount++;
            currentChunkLines.push(line);

            // Process chunk when it reaches the defined size
            if (currentChunkLines.length >= chunkSize) {
                console.log(`Processing chunk number ${++chunkCount}...`);
                const { counts, foundErrorsInChunk } = countErrorsInChunk(currentChunkLines);
                mergeErrorCounts(allErrorCounts, counts);
                errorsFoundInFile += foundErrorsInChunk;
                currentChunkLines = []; // Reset chunk for next batch
            }
        }

        // Process any remaining lines in the last chunk
        if (currentChunkLines.length > 0) {
            console.log(`Processing final chunk number ${++chunkCount}...`);
            const { counts, foundErrorsInChunk } = countErrorsInChunk(currentChunkLines);
            mergeErrorCounts(allErrorCounts, counts);
            errorsFoundInFile += foundErrorsInChunk;
        }
        
        console.log('Finished processing all chunks.');
        
        // Log file status and summary
        if (isFileOpened && linesReadCount === 0) {
            console.warn(`[WARNING] File "${filePath}" was opened, but no lines were found. It might be empty.`);
        } else if (!isFileOpened) {
            console.error(`[ERROR] File "${filePath}" could not be opened successfully.`);
            throw new Error(`Failed to open file: ${filePath}`);
        } else {
            console.log(`[INFO] Total lines read from file: ${linesReadCount}`);
            console.log(`[INFO] Total errors found matching the format: ${errorsFoundInFile}`);
        }

    } catch (err) {
        console.error(`[ERROR] Internal error during line reading:`, err.message);
        throw err;
    } finally {
        rl.close();
        fileStream.destroy(); // Release file resources
    }

    return allErrorCounts;
}

/**
 * Counts the frequency of error codes within a given array of log lines (a chunk).
 * Expected format: "Timestamp: 2023-10-27 10:00:00, Error: ERR_404"
 * @param {string[]} lines - An array of log lines.
 * @returns {{counts: Map<string, number>, foundErrorsInChunk: number}} - A map of error codes and their counts, and the number of errors found.
 */
function countErrorsInChunk(lines) {
    const errorCounts = new Map();
    let foundErrorsInChunk = 0;
    // Regex to match "Error: ERR_XXX", capturing the error code
    const errorRegex = /Error:\s*([A-Z_0-9]+)/; 

    lines.forEach((line, index) => {
        const match = line.match(errorRegex);
        if (match && match[1]) {
            const errorCode = match[1].trim(); 
            errorCounts.set(errorCode, (errorCounts.get(errorCode) || 0) + 1);
            foundErrorsInChunk++;
        } else {
            // Debugging: Log a small percentage of non-matching lines to identify format issues
            if (Math.random() < 0.001) { 
                console.log(`[DEBUG] Non-matching line (chunk ${index}): "${line.substring(0, 100)}..."`);
            }
        }
    });
    return { counts: errorCounts, foundErrorsInChunk: foundErrorsInChunk };
}

/**
 * Merges error counts from a chunk into the global error counts map.
 * @param {Map<string, number>} globalCounts - The main map accumulating all error counts.
 * @param {Map<string, number>} chunkCounts - The map of error counts from the current chunk.
 */
function mergeErrorCounts(globalCounts, chunkCounts) {
    for (const [errorCode, count] of chunkCounts.entries()) {
        globalCounts.set(errorCode, (globalCounts.get(errorCode) || 0) + count);
    }
}

/**
 * Finds the top N most frequent error codes from a given error counts map.
 * @param {Map<string, number>} errorCountsMap - The map containing all error codes and their frequencies.
 * @param {number} N - The number of top error codes to retrieve.
 * @returns {Array<[string, number]>} - An array of [errorCode, count] pairs, sorted by count in descending order.
 */
function findTopNErrors(errorCountsMap, N) {
    const sortedErrors = Array.from(errorCountsMap.entries());
    sortedErrors.sort((a, b) => b[1] - a[1]);
    return sortedErrors.slice(0, N);
}

// --- Main Program Execution ---
processLargeLogFile(LOG_FILE_PATH, CHUNK_SIZE_IN_LINES)
    .then(finalErrorCounts => {
        console.log('\n--- Log File Processing Results ---');
        const topNErrors = findTopNErrors(finalErrorCounts, N_MOST_FREQUENT);

        if (topNErrors.length > 0) {
            console.log(`Top ${N_MOST_FREQUENT} most frequent error codes:`);
            topNErrors.forEach(([errorCode, count]) => {
                console.log(`Code: ${errorCode}, Count: ${count}`);
            });
        } else {
            console.log('No error codes in the expected format were found in the file.');
            console.log('Please verify the log file format (e.g., "Error: XXX") and ensure "Error" is capitalized correctly.');
        }
    })
    .catch(err => {
        console.error('*** Critical Error: Unable to process the file ***');
        console.error('Error details:', err.message);
        if (err.code === 'ENOENT') {
            console.error(`Check: 1. Is the file path absolutely correct: "${LOG_FILE_PATH}"`);
            console.error('       2. Does the file have the necessary read permissions.');
        } else if (err.message.includes('Failed to open file')) {
            console.error('Please re-check the full file path for typos.');
        }
    });